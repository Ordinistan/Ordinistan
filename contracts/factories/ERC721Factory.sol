// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract ERC721Collection is ERC721URIStorage, ERC2981, Ownable {
    uint96 private _royaltyFee;
    address private _royaltyReceiver;
    uint256 private _tokenIds;

    constructor(
        string memory _name,
        string memory _symbol,
        address royaltyReceiver,
        uint96 royaltyFee
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        require(royaltyFee <= 10000, "ERC721: royalty fee will exceed salePrice");
        require(royaltyReceiver != address(0), "ERC721: royalty receiver is zero address");
        _setDefaultRoyalty(royaltyReceiver, royaltyFee);
        _royaltyFee = royaltyFee;
        _royaltyReceiver = royaltyReceiver;
    }

    function mint(address to, string memory _tokenURI) external onlyOwner returns (uint256) {
        _tokenIds++;
        _safeMint(to, _tokenIds);
        _setTokenURI(_tokenIds, _tokenURI);
        return _tokenIds;
    }

    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) external onlyOwner {
        require(feeNumerator <= 10000, "ERC721: royalty fee will exceed salePrice");
        require(receiver != address(0), "ERC721: royalty receiver is zero address");
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

contract ERC721Factory is Ownable {
    event CollectionCreated(address indexed collection, address indexed creator);

    constructor() Ownable(msg.sender) {}

    function createCollection(
        string memory _name,
        string memory _symbol,
        uint96 _royaltyFee
    ) external returns (address) {
        require(_royaltyFee <= 1000, "Royalty fee cannot exceed 10%");
        ERC721Collection collection = new ERC721Collection(
            _name,
            _symbol,
            msg.sender,
            _royaltyFee
        );
        collection.transferOwnership(msg.sender);
        emit CollectionCreated(address(collection), msg.sender);
        return address(collection);
    }
} 