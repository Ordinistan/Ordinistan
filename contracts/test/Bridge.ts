import { expect } from "chai";
import { ethers } from "hardhat";
import { Bridge } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Bridge", function () {
  let bridge: Bridge;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  const TEST_NAME = "Bridged Ordinals";
  const TEST_SYMBOL = "BORD";

  // Example ordinal data
  const testOrdinal = {
    inscriptionId: "1234567890abcdef1234567890abcdef12345678901234567890abcdef123456i0",
    inscriptionNumber: 1234,
    contentType: "image/png",
    contentLength: 1000,
    satOrdinal: BigInt("1234567890"),
    satRarity: "common",
    genesisTimestamp: Math.floor(Date.now() / 1000),
    tokenId: 1
  };

  beforeEach(async function () {
    // Get signers
    [owner, user, otherAccount] = await ethers.getSigners();

    // Deploy contract
    const Bridge = await ethers.getContractFactory("Bridge");
    bridge = await Bridge.deploy(
      TEST_NAME,
      TEST_SYMBOL
    ) as Bridge;
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await bridge.name()).to.equal(TEST_NAME);
      expect(await bridge.symbol()).to.equal(TEST_SYMBOL);
    });

    it("Should set the correct bridge service address", async function () {
      expect(await bridge.bridgeService()).to.equal(await owner.getAddress());
    });

    it("Should set the correct owner", async function () {
      expect(await bridge.owner()).to.equal(await owner.getAddress());
    });
  });

  describe("Access Control", function () {
    it("Should allow only bridge service to mint", async function () {
      await expect(bridge.connect(otherAccount).mintBridgedOrdinal(
        await user.getAddress(),
        testOrdinal.tokenId,
        testOrdinal.inscriptionId,
        testOrdinal.inscriptionNumber,
        testOrdinal.contentType,
        testOrdinal.contentLength,
        testOrdinal.satOrdinal,
        testOrdinal.satRarity,
        testOrdinal.genesisTimestamp
      )).to.be.revertedWith("Only bridge service can call this");
    });

    it("Should allow only owner to update bridge service", async function () {
      await expect(bridge.connect(otherAccount).updateBridgeService(
        await otherAccount.getAddress()
      )).to.be.revertedWithCustomError(bridge, "OwnableUnauthorizedAccount")
        .withArgs(await otherAccount.getAddress());
    });
  });

  describe("Minting", function () {
    it("Should mint NFT with correct metadata", async function () {
      await bridge.mintBridgedOrdinal(
        await user.getAddress(),
        testOrdinal.tokenId,
        testOrdinal.inscriptionId,
        testOrdinal.inscriptionNumber,
        testOrdinal.contentType,
        testOrdinal.contentLength,
        testOrdinal.satOrdinal,
        testOrdinal.satRarity,
        testOrdinal.genesisTimestamp
      );

      // Check ownership
      expect(await bridge.ownerOf(testOrdinal.tokenId)).to.equal(await user.getAddress());

      // Check metadata
      const metadata = await bridge.ordinalMetadata(testOrdinal.tokenId);
      expect(metadata.inscriptionId).to.equal(testOrdinal.inscriptionId);
      expect(metadata.inscriptionNumber).to.equal(testOrdinal.inscriptionNumber);
      expect(metadata.contentType).to.equal(testOrdinal.contentType);
      expect(metadata.contentLength).to.equal(testOrdinal.contentLength);
      expect(metadata.satOrdinal).to.equal(testOrdinal.satOrdinal);
      expect(metadata.satRarity).to.equal(testOrdinal.satRarity);
      expect(metadata.genesisTimestamp).to.equal(testOrdinal.genesisTimestamp);
      expect(metadata.bridgeTimestamp).to.be.gt(0);
    });

    it("Should prevent minting same inscription twice", async function () {
      await bridge.mintBridgedOrdinal(
        await user.getAddress(),
        testOrdinal.tokenId,
        testOrdinal.inscriptionId,
        testOrdinal.inscriptionNumber,
        testOrdinal.contentType,
        testOrdinal.contentLength,
        testOrdinal.satOrdinal,
        testOrdinal.satRarity,
        testOrdinal.genesisTimestamp
      );

      await expect(bridge.mintBridgedOrdinal(
        await user.getAddress(),
        testOrdinal.tokenId + 1,
        testOrdinal.inscriptionId, // Same inscription ID
        testOrdinal.inscriptionNumber,
        testOrdinal.contentType,
        testOrdinal.contentLength,
        testOrdinal.satOrdinal,
        testOrdinal.satRarity,
        testOrdinal.genesisTimestamp
      )).to.be.revertedWith("Inscription already bridged");
    });

    it("Should prevent minting to zero address", async function () {
      await expect(bridge.mintBridgedOrdinal(
        ethers.ZeroAddress,
        testOrdinal.tokenId,
        testOrdinal.inscriptionId,
        testOrdinal.inscriptionNumber,
        testOrdinal.contentType,
        testOrdinal.contentLength,
        testOrdinal.satOrdinal,
        testOrdinal.satRarity,
        testOrdinal.genesisTimestamp
      )).to.be.revertedWith("Invalid receiver address");
    });

    it("Should emit OrdinalBridged event", async function () {
      await expect(bridge.mintBridgedOrdinal(
        await user.getAddress(),
        testOrdinal.tokenId,
        testOrdinal.inscriptionId,
        testOrdinal.inscriptionNumber,
        testOrdinal.contentType,
        testOrdinal.contentLength,
        testOrdinal.satOrdinal,
        testOrdinal.satRarity,
        testOrdinal.genesisTimestamp
      )).to.emit(bridge, "OrdinalBridged")
        .withArgs(
          testOrdinal.inscriptionId,
          testOrdinal.tokenId,
          await user.getAddress(),
          testOrdinal.contentType,
          testOrdinal.satOrdinal
        );
    });
  });

  describe("Token URI", function () {
    beforeEach(async function () {
      await bridge.mintBridgedOrdinal(
        await user.getAddress(),
        testOrdinal.tokenId,
        testOrdinal.inscriptionId,
        testOrdinal.inscriptionNumber,
        testOrdinal.contentType,
        testOrdinal.contentLength,
        testOrdinal.satOrdinal,
        testOrdinal.satRarity,
        testOrdinal.genesisTimestamp
      );
    });

    it("Should return valid token URI with correct metadata and content URL", async function () {
      const tokenUri = await bridge.tokenURI(testOrdinal.tokenId);
      expect(tokenUri).to.include("data:application/json;base64,");

      // Decode base64 and parse JSON
      const base64Data = tokenUri.split(",")[1];
      const jsonData = JSON.parse(Buffer.from(base64Data, "base64").toString());

      // Check metadata format
      expect(jsonData.name).to.equal(`Bridged Ordinal #${testOrdinal.inscriptionNumber}`);
      expect(jsonData.description).to.equal("Bridged Bitcoin Ordinal");

      // Check content URLs
      const expectedContentUrl = `https://api.hiro.so/ordinals/v1/inscriptions/${testOrdinal.inscriptionId}/content`;
      expect(jsonData.image).to.equal(expectedContentUrl);
      expect(jsonData.content_url).to.equal(expectedContentUrl);

      expect(jsonData.attributes).to.be.an("array");

      // Check attributes
      const findAttribute = (traitType: string) => 
        jsonData.attributes.find((attr: any) => attr.trait_type === traitType);

      expect(findAttribute("Inscription ID").value).to.equal(testOrdinal.inscriptionId);
      expect(findAttribute("Content Type").value).to.equal(testOrdinal.contentType);
      expect(findAttribute("Content Length").value).to.equal(testOrdinal.contentLength.toString());
      expect(findAttribute("Sat Ordinal").value).to.equal(testOrdinal.satOrdinal.toString());
      expect(findAttribute("Sat Rarity").value).to.equal(testOrdinal.satRarity);
      expect(findAttribute("Genesis Timestamp").value).to.equal(testOrdinal.genesisTimestamp.toString());
    });

    it("Should revert for non-existent token", async function () {
      await expect(bridge.tokenURI(999))
        .to.be.revertedWithCustomError(bridge, "ERC721NonexistentToken")
        .withArgs(999);
    });
  });

  describe("Bridge Service Update", function () {
    it("Should allow owner to update bridge service", async function () {
      const newBridgeService = await otherAccount.getAddress();
      await bridge.connect(owner).updateBridgeService(newBridgeService);
      expect(await bridge.bridgeService()).to.equal(newBridgeService);
    });

    it("Should prevent setting bridge service to zero address", async function () {
      await expect(bridge.connect(owner).updateBridgeService(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid bridge service address");
    });
  });
}); 