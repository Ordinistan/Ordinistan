import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { OrdinalBridge, LightRelay } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployLightRelay } from "./helpers/deployLightRelay";
import { deployOrdinalBridge } from "./helpers/deployOrdinalBridge";
import { loadJsonFile } from "./helpers/loadJsonFile";
import { concatenateHexStrings } from "./helpers/contract-test-helpers";
import { BytesLike } from "ethers";

const REAL_INSCRIPTION = {
  inscriptionId: "6037f433a9ee1dfcb68d2f5c5c62cfd3f6c2d42c9a3fb94fe918f87d8d33db64i0",
  inscriptionNumber: 1234567,
  contentType: "text/plain",
  contentLength: 1000,
  blockHash: "000000000000000000000b5d281f3b3b7d3f0b3b3b3b3b3b3b3b3b3b3b3b3b3b",
  blockHeight: 800000,
  genesisTimestamp: 1677777777,
  satOrdinal: "1234567890",
  satRarity: "common",
  outputValue: 10000,
  txId: "6037f433a9ee1dfcb68d2f5c5c62cfd3f6c2d42c9a3fb94fe918f87d8d33db64"
};

describe("OrdinalBridge", function () {
  let ordinalBridge: OrdinalBridge;
  let lightRelay: LightRelay;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let receiver: SignerWithAddress;

  const BRIDGE_NAME = "Bridged Ordinals";
  const BRIDGE_SYMBOL = "BORD";

  const testInscriptionId = "1234567890abcdef";
  const testInscriptionNumber = "1234";
  const testContentType = "image/png";
  const testTokenId = 1;
  const mockBtcBlockHash = ethers.keccak256(ethers.toUtf8Bytes("mock_block"));

  // Create mock ordinal transaction and witness data
  const createMockOrdinalTx = () => {
    // Version (4 bytes) + dummy inputs and outputs + locktime (4 bytes)
    const version = "01000000"; // Version 1
    const inputCount = "01"; // 1 input
    const prevTxId = "0000000000000000000000000000000000000000000000000000000000000000";
    const prevOutIndex = "ffffffff"; // -1 (coinbase)
    const scriptSigLen = "00"; // Empty script
    const sequence = "ffffffff"; // Max sequence
    const outputCount = "01"; // 1 output
    const value = "0000000000000000"; // 0 BTC
    const scriptPubKeyLen = "00"; // Empty script
    const locktime = "00000000"; // 0
    
    return "0x" + version + inputCount + prevTxId + prevOutIndex + scriptSigLen + sequence + 
           outputCount + value + scriptPubKeyLen + locktime;
  };

  // Create mock witness data with ordinal inscription
  const createMockWitnessData = (contentType: string) => {
    // OP_FALSE (0x00) + OP_IF (0x63) + 'ord' (0x6f7264) + version (0x01) + content type + OP_0 (0x00) + content
    const opFalseOpIf = "0063"; // OP_FALSE OP_IF
    const ordMarker = "6f7264"; // 'ord'
    const version = "01"; // Version 1
    
    // Convert content type to hex
    let contentTypeHex = "";
    for (let i = 0; i < contentType.length; i++) {
      contentTypeHex += contentType.charCodeAt(i).toString(16);
    }
    
    const separator = "00"; // OP_0
    const content = "48656c6c6f2c20776f726c6421"; // "Hello, world!" in hex
    const opEndIf = "68"; // OP_ENDIF
    
    return "0x" + opFalseOpIf + ordMarker + version + contentTypeHex + separator + content + opEndIf;
  };

  // Create mock headers with a known merkle root
  const createMockHeaders = (txId: string): string => {
    // For testing, we'll create headers that will result in a merkle root equal to txId
    // This way the merkle proof verification will pass with our empty proof
    return txId; // The header is just the txId, which will be hashed into itself
  };

  // Create mock merkle proof that will pass validation
  const createMockMerkleProof = (txId: string): { proof: BytesLike, merkleRoot: string } => {
    // For testing, we'll create a simple proof that just contains the txId
    const proof = ethers.hexlify(ethers.zeroPadValue(ethers.toBeArray(txId), 32));
    const merkleRoot = txId; // For testing, merkle root is the same as txId
    return { proof, merkleRoot };
  };

  // Load test headers from the LightRelay test data
  // These headers are valid Bitcoin block headers that we use to verify the chain
  const headers = loadJsonFile("headersWithRetarget.json");
  const headerHex = headers.chain.map((header: any) => header.hex);
  const validHeaders = concatenateHexStrings(headerHex.slice(0, 4));

  // Create a function to derive the expected inscription ID from the tx data
  const deriveInscriptionId = (txData: string): string => {
    // In our implementation, the inscription ID is just the hash of the tx data
    // In a real implementation, it would be derived from txid + output index
    const txHash = ethers.keccak256(txData);
    return txHash.substring(2); // Remove 0x prefix
  };

  // TODO: We need to add:
  // 1. A way to verify that a specific transaction exists in the blocks
  // 2. A way to verify that the transaction is an ordinal transaction
  // 3. A way to extract ordinal data from the transaction
  // This could be done by:
  // - Adding a merkle proof verification
  // - Adding ordinal transaction structure validation
  // - Adding ordinal data extraction and validation

  async function setupFixture() {
    const [owner, receiver] = await ethers.getSigners();

    const LightRelay = await ethers.getContractFactory("LightRelay");
    const lightRelay = await LightRelay.deploy();

    const OrdinalBridge = await ethers.getContractFactory("OrdinalBridge");
    const ordinalBridge = await OrdinalBridge.deploy(await lightRelay.getAddress());

    return { ordinalBridge, lightRelay, owner, receiver };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { ordinalBridge } = await loadFixture(setupFixture);
      expect(await ordinalBridge.name()).to.equal("Bridged Ordinals");
      expect(await ordinalBridge.symbol()).to.equal("BORD");
    });

    it("Should set the correct light relay address", async function () {
      const { ordinalBridge, lightRelay } = await loadFixture(setupFixture);
      expect(await ordinalBridge.lightRelay()).to.equal(await lightRelay.getAddress());
    });
  });

  describe("Bridge Operations", function () {
    it("Should bridge an ordinal successfully", async function () {
      const { ordinalBridge, receiver } = await loadFixture(setupFixture);
      
      const mockOrdinalTxData = createMockOrdinalTx();
      const mockWitnessData = createMockWitnessData(REAL_INSCRIPTION.contentType);
      const mockHeaders = createMockHeaders(REAL_INSCRIPTION.txId);
      const { proof, merkleRoot } = createMockMerkleProof(REAL_INSCRIP TION.txId);

      const bridgeParams: OrdinalBridge.BridgeParamsStruct = {
        btcTxId: ethers.hexlify(ethers.zeroPadValue(ethers.toBeArray(REAL_INSCRIPTION.txId), 32)),
        headers: mockHeaders,
        tokenId: REAL_INSCRIPTION.inscriptionNumber,
        receiver: receiver.address,
        inscriptionId: REAL_INSCRIPTION.inscriptionId,
        inscriptionNumber: REAL_INSCRIPTION.inscriptionNumber,
        contentType: REAL_INSCRIPTION.contentType,
        contentLength: REAL_INSCRIPTION.contentLength,
        btcBlockHash: `0x${REAL_INSCRIPTION.blockHash}`,
        blockHeight: REAL_INSCRIPTION.blockHeight,
        genesisTimestamp: REAL_INSCRIPTION.genesisTimestamp,
        satOrdinal: REAL_INSCRIPTION.satOrdinal,
        satRarity: REAL_INSCRIPTION.satRarity,
        outputValue: REAL_INSCRIPTION.outputValue,
        btcTx: mockOrdinalTxData,
        proof: proof,
        index: 0,
        witness: mockWitnessData
      };

      await ordinalBridge.bridgeOrdinal(bridgeParams);

      expect(await ordinalBridge.ownerOf(REAL_INSCRIPTION.inscriptionNumber)).to.equal(receiver.address);
    });

    it("Should reject bridging with invalid ordinal transaction data", async function () {
      const { ordinalBridge, receiver } = await loadFixture(setupFixture);
      
      const mockOrdinalTxData = createMockOrdinalTx();
      const invalidWitnessData = ethers.hexlify(ethers.randomBytes(32)); // Invalid witness data
      const mockHeaders = createMockHeaders(REAL_INSCRIPTION.txId);
      const { proof, merkleRoot } = createMockMerkleProof(REAL_INSCRIPTION.txId);

      const bridgeParams: OrdinalBridge.BridgeParamsStruct = {
        btcTxId: ethers.hexlify(ethers.zeroPadValue(ethers.toBeArray(REAL_INSCRIPTION.txId), 32)),
        headers: mockHeaders,
        tokenId: REAL_INSCRIPTION.inscriptionNumber,
        receiver: receiver.address,
        inscriptionId: REAL_INSCRIPTION.inscriptionId,
        inscriptionNumber: REAL_INSCRIPTION.inscriptionNumber,
        contentType: REAL_INSCRIPTION.contentType,
        contentLength: REAL_INSCRIPTION.contentLength,
        btcBlockHash: `0x${REAL_INSCRIPTION.blockHash}`,
        blockHeight: REAL_INSCRIPTION.blockHeight,
        genesisTimestamp: REAL_INSCRIPTION.genesisTimestamp,
        satOrdinal: REAL_INSCRIPTION.satOrdinal,
        satRarity: REAL_INSCRIPTION.satRarity,
        outputValue: REAL_INSCRIPTION.outputValue,
        btcTx: mockOrdinalTxData,
        proof: proof,
        index: 0,
        witness: invalidWitnessData
      };

      await expect(
        ordinalBridge.bridgeOrdinal(bridgeParams)
      ).to.be.revertedWith("No ordinal inscription found");
    });

    it("Should reject bridging with incorrect content type", async function () {
      const { ordinalBridge, receiver } = await loadFixture(setupFixture);
      
      const mockOrdinalTxData = createMockOrdinalTx();
      const mockWitnessData = createMockWitnessData("image/png"); // Different content type
      const mockHeaders = createMockHeaders(REAL_INSCRIPTION.txId);
      const { proof, merkleRoot } = createMockMerkleProof(REAL_INSCRIPTION.txId);

      const bridgeParams: OrdinalBridge.BridgeParamsStruct = {
        btcTxId: ethers.hexlify(ethers.zeroPadValue(ethers.toBeArray(REAL_INSCRIPTION.txId), 32)),
        headers: mockHeaders,
        tokenId: REAL_INSCRIPTION.inscriptionNumber,
        receiver: receiver.address,
        inscriptionId: REAL_INSCRIPTION.inscriptionId,
        inscriptionNumber: REAL_INSCRIPTION.inscriptionNumber,
        contentType: "text/plain", // Different content type
        contentLength: REAL_INSCRIPTION.contentLength,
        btcBlockHash: `0x${REAL_INSCRIPTION.blockHash}`,
        blockHeight: REAL_INSCRIPTION.blockHeight,
        genesisTimestamp: REAL_INSCRIPTION.genesisTimestamp,
        satOrdinal: REAL_INSCRIPTION.satOrdinal,
        satRarity: REAL_INSCRIPTION.satRarity,
        outputValue: REAL_INSCRIPTION.outputValue,
        btcTx: mockOrdinalTxData,
        proof: proof,
        index: 0,
        witness: mockWitnessData
      };

      await expect(
        ordinalBridge.bridgeOrdinal(bridgeParams)
      ).to.be.revertedWith("Content type mismatch");
    });

    it("Should reject bridging with incorrect inscription ID", async function () {
      const { ordinalBridge, receiver } = await loadFixture(setupFixture);
      
      const mockOrdinalTxData = createMockOrdinalTx();
      const mockWitnessData = createMockWitnessData(REAL_INSCRIPTION.contentType);
      const mockHeaders = createMockHeaders(REAL_INSCRIPTION.txId);
      const { proof, merkleRoot } = createMockMerkleProof(REAL_INSCRIPTION.txId);

      const bridgeParams: OrdinalBridge.BridgeParamsStruct = {
        btcTxId: ethers.hexlify(ethers.zeroPadValue(ethers.toBeArray(REAL_INSCRIPTION.txId), 32)),
        headers: mockHeaders,
        tokenId: REAL_INSCRIPTION.inscriptionNumber,
        receiver: receiver.address,
        inscriptionId: "incorrect_inscription_id", // Incorrect ID
        inscriptionNumber: REAL_INSCRIPTION.inscriptionNumber,
        contentType: REAL_INSCRIPTION.contentType,
        contentLength: REAL_INSCRIPTION.contentLength,
        btcBlockHash: `0x${REAL_INSCRIPTION.blockHash}`,
        blockHeight: REAL_INSCRIPTION.blockHeight,
        genesisTimestamp: REAL_INSCRIPTION.genesisTimestamp,
        satOrdinal: REAL_INSCRIPTION.satOrdinal,
        satRarity: REAL_INSCRIPTION.satRarity,
        outputValue: REAL_INSCRIPTION.outputValue,
        btcTx: mockOrdinalTxData,
        proof: proof,
        index: 0,
        witness: mockWitnessData
      };

      await expect(
        ordinalBridge.bridgeOrdinal(bridgeParams)
      ).to.be.revertedWith("Invalid inscription ID format");
    });

    it("Should prevent double bridging of the same transaction", async function () {
      const { ordinalBridge, receiver } = await loadFixture(setupFixture);
      
      const mockOrdinalTxData = createMockOrdinalTx();
      const mockWitnessData = createMockWitnessData(REAL_INSCRIPTION.contentType);
      const mockHeaders = createMockHeaders(REAL_INSCRIPTION.txId);
      const { proof, merkleRoot } = createMockMerkleProof(REAL_INSCRIPTION.txId);

      const bridgeParams: OrdinalBridge.BridgeParamsStruct = {
        btcTxId: ethers.hexlify(ethers.zeroPadValue(ethers.toBeArray(REAL_INSCRIPTION.txId), 32)),
        headers: mockHeaders,
        tokenId: REAL_INSCRIPTION.inscriptionNumber,
        receiver: receiver.address,
        inscriptionId: REAL_INSCRIPTION.inscriptionId,
        inscriptionNumber: REAL_INSCRIPTION.inscriptionNumber,
        contentType: REAL_INSCRIPTION.contentType,
        contentLength: REAL_INSCRIPTION.contentLength,
        btcBlockHash: `0x${REAL_INSCRIPTION.blockHash}`,
        blockHeight: REAL_INSCRIPTION.blockHeight,
        genesisTimestamp: REAL_INSCRIPTION.genesisTimestamp,
        satOrdinal: REAL_INSCRIPTION.satOrdinal,
        satRarity: REAL_INSCRIPTION.satRarity,
        outputValue: REAL_INSCRIPTION.outputValue,
        btcTx: mockOrdinalTxData,
        proof: proof,
        index: 0,
        witness: mockWitnessData
      };

      await ordinalBridge.bridgeOrdinal(bridgeParams);

      // Attempt second bridge with same transaction
      const secondBridgeParams: OrdinalBridge.BridgeParamsStruct = {
        ...bridgeParams,
        tokenId: REAL_INSCRIPTION.inscriptionNumber + 1
      };

      await expect(
        ordinalBridge.bridgeOrdinal(secondBridgeParams)
      ).to.be.revertedWith("Transaction already processed");
    });

    it("Should generate correct tokenURI", async function () {
      const { ordinalBridge, receiver } = await loadFixture(setupFixture);
      
      const mockOrdinalTxData = createMockOrdinalTx();
      const mockWitnessData = createMockWitnessData(REAL_INSCRIPTION.contentType);
      const mockHeaders = createMockHeaders(REAL_INSCRIPTION.txId);
      const { proof, merkleRoot } = createMockMerkleProof(REAL_INSCRIPTION.txId);

      const bridgeParams: OrdinalBridge.BridgeParamsStruct = {
        btcTxId: ethers.hexlify(ethers.zeroPadValue(ethers.toBeArray(REAL_INSCRIPTION.txId), 32)),
        headers: mockHeaders,
        tokenId: REAL_INSCRIPTION.inscriptionNumber,
        receiver: receiver.address,
        inscriptionId: REAL_INSCRIPTION.inscriptionId,
        inscriptionNumber: REAL_INSCRIPTION.inscriptionNumber,
        contentType: REAL_INSCRIPTION.contentType,
        contentLength: REAL_INSCRIPTION.contentLength,
        btcBlockHash: `0x${REAL_INSCRIPTION.blockHash}`,
        blockHeight: REAL_INSCRIPTION.blockHeight,
        genesisTimestamp: REAL_INSCRIPTION.genesisTimestamp,
        satOrdinal: REAL_INSCRIPTION.satOrdinal,
        satRarity: REAL_INSCRIPTION.satRarity,
        outputValue: REAL_INSCRIPTION.outputValue,
        btcTx: mockOrdinalTxData,
        proof: proof,
        index: 0,
        witness: mockWitnessData
      };

      await ordinalBridge.bridgeOrdinal(bridgeParams);

      const tokenURI = await ordinalBridge.tokenURI(REAL_INSCRIPTION.inscriptionNumber);
      expect(tokenURI).to.include("data:application/json;base64,");
      
      // Decode base64 and verify content
      const base64Data = tokenURI.split(",")[1];
      const jsonString = Buffer.from(base64Data, "base64").toString();
      const metadata = JSON.parse(jsonString);
      
      expect(metadata.name).to.equal(`Bridged Ordinal #${REAL_INSCRIPTION.inscriptionNumber}`);
      expect(metadata.description).to.equal("Bridged Bitcoin Ordinal on Core Chain");
      expect(metadata.attributes).to.have.length.above(0);
      
      // Find attributes by trait type
      const findAttribute = (traitType: string) => metadata.attributes.find((attr: any) => attr.trait_type === traitType);
      
      expect(findAttribute("Inscription ID").value).to.equal(REAL_INSCRIPTION.inscriptionId);
      expect(findAttribute("Content Type").value).to.equal(REAL_INSCRIPTION.contentType);
      expect(findAttribute("Content Length").value).to.equal(REAL_INSCRIPTION.contentLength.toString());
      expect(findAttribute("Original Owner").value.toLowerCase()).to.equal(receiver.address.toLowerCase());
      expect(findAttribute("Bridge Timestamp").value).to.be.a("string");
      expect(parseInt(findAttribute("Bridge Timestamp").value)).to.be.gt(0);
      expect(findAttribute("Bitcoin Block Hash").value).to.equal(`0x${REAL_INSCRIPTION.blockHash}`);
      expect(findAttribute("Block Height").value).to.equal(REAL_INSCRIPTION.blockHeight.toString());
      expect(findAttribute("Genesis Timestamp").value).to.equal(REAL_INSCRIPTION.genesisTimestamp.toString());
      expect(findAttribute("Sat Ordinal").value).to.equal(REAL_INSCRIPTION.satOrdinal);
      expect(findAttribute("Sat Rarity").value).to.equal(REAL_INSCRIPTION.satRarity);
      expect(findAttribute("Output Value").value).to.equal(REAL_INSCRIPTION.outputValue.toString());
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update light relay address", async function () {
      const { ordinalBridge, owner } = await loadFixture(setupFixture);
      const newLightRelay = ethers.Wallet.createRandom().address;
      await ordinalBridge.connect(owner).updateLightRelay(newLightRelay);
      expect(await ordinalBridge.lightRelay()).to.equal(newLightRelay);
    });

    it("Should prevent non-owner from updating light relay address", async function () {
      const { ordinalBridge, receiver } = await loadFixture(setupFixture);
      const newLightRelay = ethers.Wallet.createRandom().address;
      await expect(
        ordinalBridge.connect(receiver).updateLightRelay(newLightRelay)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 