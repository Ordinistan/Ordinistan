// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Bridge is ERC721, Ownable {
    using Strings for uint256;

    // Struct to store ordinal metadata
    struct OrdinalMetadata {
        string inscriptionId;      // Format: <txid>i<index>
        uint256 inscriptionNumber; // Ordinal number
        string contentType;        // MIME type
        uint256 contentLength;     // Size of the content
        uint256 satOrdinal;       // Ordinal number of the sat
        string satRarity;         // Rarity of the sat
        uint256 genesisTimestamp; // Original inscription timestamp
        uint256 bridgeTimestamp;  // When it was bridged
    }

    // Mapping from token ID to metadata
    mapping(uint256 => OrdinalMetadata) public ordinalMetadata;
    
    // Mapping to track processed inscription IDs
    mapping(string => bool) public processedInscriptions;
    
    // Service account that can mint NFTs (our bridge listener)
    address public bridgeService;

    // Base URL for Hiro API
    string public HIRO_API_BASE = "https://api.hiro.so/ordinals/v1/inscriptions/";
    
    // Events
    event OrdinalBridged(
        string indexed inscriptionId,
        uint256 indexed tokenId,
        address indexed receiver,
        string contentType,
        uint256 satOrdinal
    );

    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        bridgeService = msg.sender;
    }

    modifier onlyBridgeService() {
        require(msg.sender == bridgeService, "Only bridge service can call this");
        _;
    }

    /**
     * Mint an NFT for a bridged ordinal
     * This can only be called by the bridge service after verifying the ordinal transfer
     */
    function mintBridgedOrdinal(
        address receiver,
        uint256 tokenId,
        string calldata inscriptionId,
        uint256 inscriptionNumber,
        string calldata contentType,
        uint256 contentLength,
        uint256 satOrdinal,
        string calldata satRarity,
        uint256 genesisTimestamp
    ) external onlyBridgeService {
        require(!processedInscriptions[inscriptionId], "Inscription already bridged");
        require(receiver != address(0), "Invalid receiver address");

        // Store ordinal metadata
        ordinalMetadata[tokenId] = OrdinalMetadata({
            inscriptionId: inscriptionId,
            inscriptionNumber: inscriptionNumber,
            contentType: contentType,
            contentLength: contentLength,
            satOrdinal: satOrdinal,
            satRarity: satRarity,
            genesisTimestamp: genesisTimestamp,
            bridgeTimestamp: block.timestamp
        });

        // Mark inscription as processed
        processedInscriptions[inscriptionId] = true;

        // Mint the NFT
        _safeMint(receiver, tokenId);

        emit OrdinalBridged(
            inscriptionId,
            tokenId,
            receiver,
            contentType,
            satOrdinal
        );
    }

    /**
     * Update the bridge service address
     */
    function updateBridgeService(address _newBridgeService) external onlyOwner {
        require(_newBridgeService != address(0), "Invalid bridge service address");
        bridgeService = _newBridgeService;
    }

    function removeProcessedInscription(string calldata inscriptionId) external onlyOwner {
        processedInscriptions[inscriptionId] = false;
    }

    /**
     * Get token URI with metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert ERC721NonexistentToken(tokenId);
        
        OrdinalMetadata memory metadata = ordinalMetadata[tokenId];
        
        // Create the content URL from Hiro API
        string memory contentUrl = string(
            abi.encodePacked(
                HIRO_API_BASE,
                metadata.inscriptionId,
                "/content"
            )
        );

        // Create JSON metadata
        string memory json = string(
            abi.encodePacked(
                '{"name": "Bridged Ordinal #',
                Strings.toString(metadata.inscriptionNumber),
                '", "description": "Bridged Bitcoin Ordinal", ',
                '"image": "',
                contentUrl,
                '", "content_url": "',
                contentUrl,
                '", "attributes": [',
                '{"trait_type": "Inscription ID", "value": "',
                metadata.inscriptionId,
                '"}, {"trait_type": "Content Type", "value": "',
                metadata.contentType,
                '"}, {"trait_type": "Content Length", "value": "',
                Strings.toString(metadata.contentLength),
                '"}, {"trait_type": "Sat Ordinal", "value": "',
                Strings.toString(metadata.satOrdinal),
                '"}, {"trait_type": "Sat Rarity", "value": "',
                metadata.satRarity,
                '"}, {"trait_type": "Genesis Timestamp", "value": "',
                Strings.toString(metadata.genesisTimestamp),
                '"}, {"trait_type": "Bridge Timestamp", "value": "',
                Strings.toString(metadata.bridgeTimestamp),
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
}

// Base64 encoding library
library Base64 {
    string internal constant TABLE =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";

        string memory table = TABLE;
        string memory result = new string(4 * ((data.length + 2) / 3));

        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)

            for {
                let dataPtr := data
                let endPtr := add(data, mload(data))
            } lt(dataPtr, endPtr) {

            } {
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