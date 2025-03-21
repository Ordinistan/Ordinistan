// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IRelay.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {BTCUtils} from "@keep-network/bitcoin-spv-sol/contracts/BTCUtils.sol";
import {ValidateSPV} from "@keep-network/bitcoin-spv-sol/contracts/ValidateSPV.sol";
import {BytesLib} from "@keep-network/bitcoin-spv-sol/contracts/BytesLib.sol";

contract OrdinalBridge is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;
    using BTCUtils for bytes;
    using ValidateSPV for bytes;
    using BytesLib for bytes;

    IRelay public lightRelay;
    mapping(bytes32 => bool) public processedTransactions;
    mapping(uint256 => OrdinalMetadata) public ordinalMetadata;
    
    struct OrdinalMetadata {
        string inscriptionId;      // Format: <txid>i<index>
        uint256 inscriptionNumber; // Ordinal number
        string contentType;        // MIME type
        uint256 contentLength;     // Size of the content
        address originalOwner;     // Original receiver address
        uint256 bridgeTimestamp;   // When it was bridged
        bytes32 btcBlockHash;      // Bitcoin block hash containing the inscription
        uint256 blockHeight;       // Bitcoin block height
        uint256 genesisTimestamp;  // Original inscription timestamp
        uint256 satOrdinal;       // Ordinal number of the sat
        string satRarity;         // Rarity of the sat
        uint256 outputValue;      // Value of the output in sats
    }

    struct BridgeParams {
        bytes32 btcTxId;          // Transaction ID
        bytes headers;            // Bitcoin block headers
        uint256 tokenId;          // EVM token ID
        address receiver;         // Receiver address
        string inscriptionId;     // Full inscription ID
        uint256 inscriptionNumber; // Ordinal number
        string contentType;       // MIME type
        uint256 contentLength;    // Content size
        bytes32 btcBlockHash;     // Block hash
        uint256 blockHeight;      // Block height
        uint256 genesisTimestamp; // Timestamp
        uint256 satOrdinal;      // Sat ordinal number
        string satRarity;        // Sat rarity
        uint256 outputValue;     // Output value
        bytes btcTx;             // Full Bitcoin transaction
        bytes proof;             // Merkle proof
        uint256 index;           // Index in merkle tree
        bytes witness;           // Witness data containing ordinal inscription
    }

    event OrdinalBridged(
        bytes32 indexed btcTxId,
        uint256 indexed tokenId,
        address indexed receiver,
        string inscriptionId,
        uint256 inscriptionNumber,
        string contentType,
        uint256 blockHeight,
        bytes32 btcBlockHash
    );

    event BridgeReleased(
        uint256 indexed tokenId,
        address indexed owner,
        string inscriptionId
    );

    event LightRelayUpdated(address indexed newLightRelay);

    constructor(
        string memory _name,
        string memory _symbol,
        address _lightRelay
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        require(_lightRelay != address(0), "Invalid Light Relay address");
        lightRelay = IRelay(_lightRelay);
    }

    function bridgeOrdinal(
        BridgeParams calldata params
    ) external nonReentrant {
        require(!processedTransactions[params.btcTxId], "Transaction already processed");
        require(params.receiver != address(0), "Invalid receiver address");
        // require(params.contentLength > 0, "Content length must be positive");
        // require(params.outputValue >= 546, "Output value must be at least 546 sats");
        // require(params.blockHeight > 0, "Block height must be positive");
        // require(params.genesisTimestamp > 0, "Genesis timestamp must be positive");

        // Step 1: Verify the Bitcoin block headers using Light Relay
        (uint256 startingHeaderTimestamp, uint256 headerCount) = lightRelay.validateChain(params.headers);
        // require(headerCount > 0, "Invalid header chain");

        // Step 2: Extract merkle root from the block header and verify transaction inclusion
        // bytes32 merkleRoot = extractMerkleRoot(params.headers);
        // require(
        //     verifyTxInclusion(
        //         params.btcTxId,
        //         merkleRoot,
        //         params.proof,
        //         params.index
        //     ),
        //     "Transaction not included in block"
        // );

        // // Step 3: Verify the transaction format and extract ordinal data
        // require(
        //     verifyOrdinalTransaction(
        //         params.btcTx,
        //         params.witness,
        //         params.contentType,
        //         params.outputValue
        //     ),
        //     "Invalid ordinal transaction"
        // );

        // // Step 4: Verify inscription ID format and match with transaction
        // require(
        //     verifyInscriptionIdFormat(params.btcTxId, params.inscriptionId),
        //     "Invalid inscription ID format"
        // );

        // // Store ordinal metadata
        // ordinalMetadata[params.tokenId] = OrdinalMetadata({
        //     inscriptionId: params.inscriptionId,
        //     inscriptionNumber: params.inscriptionNumber,
        //     contentType: params.contentType,
        //     contentLength: params.contentLength,
        //     originalOwner: params.receiver,
        //     bridgeTimestamp: block.timestamp,
        //     btcBlockHash: params.btcBlockHash,
        //     blockHeight: params.blockHeight,
        //     genesisTimestamp: params.genesisTimestamp,
        //     satOrdinal: params.satOrdinal,
        //     satRarity: params.satRarity,
        //     outputValue: params.outputValue
        // });

        // Mark transaction as processed
        processedTransactions[params.btcTxId] = true;

        // Mint the NFT
        _safeMint(params.receiver, params.tokenId);

        // emit OrdinalBridged(
        //     params.btcTxId,
        //     params.tokenId,
        //     params.receiver,
        //     params.inscriptionId,
        //     params.inscriptionNumber,
        //     params.contentType,
        //     params.blockHeight,
        //     params.btcBlockHash
        // );
    }

    function extractMerkleRoot(bytes memory header) internal pure returns (bytes32) {
        require(header.length >= 80, "Invalid header length");
        bytes32 merkleRoot;
        assembly {
            // Merkle root starts at offset 36 in the header
            merkleRoot := mload(add(add(header, 0x20), 36))
        }
        return merkleRoot;
    }

    function verifyTxInclusion(
        bytes32 txId,
        bytes32 merkleRoot,
        bytes memory proof,
        uint256 index
    ) internal returns (bool) {
        return ValidateSPV.prove(
            txId,
            merkleRoot,
            proof,
            index
        );
    }

    function verifyOrdinalTransaction(
        bytes memory txData,
        bytes memory witnessData,
        string memory expectedContentType,
        uint256 expectedValue
    ) internal pure returns (bool) {
        // Verify basic transaction structure
        require(txData.length >= 10, "Invalid transaction data");

        // Parse transaction to verify output value
        uint256 outputValue = BTCUtils.extractValue(txData);
        require(outputValue == expectedValue, "Output value mismatch");

        // Parse witness data to find ordinal inscription
        bool foundOrdMarker = false;
        uint256 contentTypeStart;

        // Look for ordinal marker in witness data
        // Format: OP_FALSE OP_IF 'ord' [1 byte version] [content-type] OP_0 [content] OP_ENDIF
        for (uint i = 0; i < witnessData.length - 6; i++) {
            if (witnessData[i] == 0x00 && // OP_FALSE
                witnessData[i+1] == 0x63 && // OP_IF
                witnessData[i+2] == 0x6f && // 'o'
                witnessData[i+3] == 0x72 && // 'r'
                witnessData[i+4] == 0x64) { // 'd'
                foundOrdMarker = true;
                contentTypeStart = i + 6; // Skip 'ord' and version byte
                break;
            }
        }

        require(foundOrdMarker, "No ordinal inscription found");

        // Extract and verify content type
        string memory contentType = extractContentType(witnessData, contentTypeStart);
        require(
            keccak256(bytes(contentType)) == keccak256(bytes(expectedContentType)),
            "Content type mismatch"
        );

        return true;
    }

    function extractContentType(
        bytes memory witnessData,
        uint256 start
    ) internal pure returns (string memory) {
        uint256 end = start;
        while (end < witnessData.length && witnessData[end] != 0x00) {
            end++;
        }
        
        bytes memory contentType = new bytes(end - start);
        for (uint i = 0; i < end - start; i++) {
            contentType[i] = witnessData[start + i];
        }
        
        return string(contentType);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert ERC721NonexistentToken(tokenId);
        
        OrdinalMetadata memory metadata = ordinalMetadata[tokenId];
        
        // Create JSON metadata
        string memory json = string(
            abi.encodePacked(
                '{"name": "Bridged Ordinal #',
                Strings.toString(metadata.inscriptionNumber),
                '", "description": "Bridged Bitcoin Ordinal on Core Chain", ',
                '"attributes": [',
                '{"trait_type": "Inscription ID", "value": "',
                metadata.inscriptionId,
                '"}, {"trait_type": "Content Type", "value": "',
                metadata.contentType,
                '"}, {"trait_type": "Content Length", "value": "',
                Strings.toString(metadata.contentLength),
                '"}, {"trait_type": "Original Owner", "value": "',
                Strings.toHexString(uint256(uint160(metadata.originalOwner)), 20),
                '"}, {"trait_type": "Bridge Timestamp", "value": "',
                Strings.toString(metadata.bridgeTimestamp),
                '"}, {"trait_type": "Bitcoin Block Hash", "value": "',
                Strings.toHexString(uint256(metadata.btcBlockHash)),
                '"}, {"trait_type": "Block Height", "value": "',
                Strings.toString(metadata.blockHeight),
                '"}, {"trait_type": "Genesis Timestamp", "value": "',
                Strings.toString(metadata.genesisTimestamp),
                '"}, {"trait_type": "Sat Ordinal", "value": "',
                Strings.toString(metadata.satOrdinal),
                '"}, {"trait_type": "Sat Rarity", "value": "',
                metadata.satRarity,
                '"}, {"trait_type": "Output Value", "value": "',
                Strings.toString(metadata.outputValue),
                '"}]}'
            )
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }

    function verifyInscriptionIdFormat(bytes32 txId, string memory inscriptionId) internal pure returns (bool) {
        // Convert txId to hex string
        string memory txIdStr = bytes32ToHexString(txId);
        
        // Verify format: <txid>i<index>
        bytes memory inscriptionBytes = bytes(inscriptionId);
        bytes memory txIdBytes = bytes(txIdStr);
        
        // Check if inscription ID starts with the txId
        for (uint i = 0; i < 64; i++) {
            if (inscriptionBytes[i] != txIdBytes[i]) {
                return false;
            }
        }
        
        // Verify 'i' character after txId
        return inscriptionBytes[64] == 0x69; // 'i' character
    }

    function bytes32ToHexString(bytes32 value) internal pure returns (string memory) {
        bytes memory HEX = "0123456789abcdef";
        bytes memory str = new bytes(64);
        for (uint i = 0; i < 32; i++) {
            str[i*2] = HEX[uint8(value[i] >> 4)];
            str[i*2+1] = HEX[uint8(value[i] & 0x0f)];
        }
        return string(str);
    }

    function updateLightRelay(address _newLightRelay) external onlyOwner {
        require(_newLightRelay != address(0), "Invalid Light Relay address");
        lightRelay = IRelay(_newLightRelay);
        emit LightRelayUpdated(_newLightRelay);
    }
}

// Base64 encoding library
library Base64 {
    string internal constant TABLE =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";

        // Load the table into memory
        string memory table = TABLE;

        // Encoding takes 3 bytes chunks of binary data from `bytes` data parameter
        // and split into 4 numbers of 6 bits.
        // The final Base64 length should be `bytes` data length multiplied by 4/3 rounded up
        // - `data.length + 2`  -> Round up
        // - `/ 3`              -> Number of 3-bytes chunks
        // - `4 *`              -> 4 characters for each chunk
        string memory result = new string(4 * ((data.length + 2) / 3));

        assembly {
            // Prepare the lookup table (skip the first "length" byte)
            let tablePtr := add(table, 1)

            // Prepare result pointer, jump over length
            let resultPtr := add(result, 32)

            // Run over the input, 3 bytes at a time
            for {
                let dataPtr := data
                let endPtr := add(data, mload(data))
            } lt(dataPtr, endPtr) {

            } {
                // Advance 3 bytes
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)

                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }

            // Handle padding
            switch mod(mload(data), 3)
            case 1 {
                mstore8(sub(resultPtr, 1), 0x3d)
                mstore8(sub(resultPtr, 2), 0x3d)
            }
            case 2 {
                mstore8(sub(resultPtr, 1), 0x3d)
            }
        }

        return result;
    }
} 