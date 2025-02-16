// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract ERC1155Collection is ERC1155, ERC2981, Ownable {
    string public name;
    string public symbol;
    uint96 private _royaltyFee;
    address private _royaltyReceiver;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory baseURI,
        address royaltyReceiver,
        uint96 royaltyFee
    ) ERC1155(baseURI) Ownable(msg.sender) {
        require(royaltyFee <= 10000, "ERC1155: royalty fee will exceed salePrice");
        require(royaltyReceiver != address(0), "ERC1155: royalty receiver is zero address");
        name = _name;
        symbol = _symbol;
        _setDefaultRoyalty(royaltyReceiver, royaltyFee);
        _royaltyFee = royaltyFee;
        _royaltyReceiver = royaltyReceiver;
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external onlyOwner {
        _mint(to, id, amount, data);
    }

    function setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96 feeNumerator
    ) external onlyOwner {
        require(feeNumerator <= 10000, "ERC1155: royalty fee will exceed salePrice");
        require(receiver != address(0), "ERC1155: royalty receiver is zero address");
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

contract ERC1155Factory is Ownable {
    event CollectionCreated(address indexed collection, address indexed creator);

    constructor() Ownable(msg.sender) {}

    function createCollection(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint96 royaltyFee
    ) external returns (address) {
        require(royaltyFee <= 1000, "Royalty fee cannot exceed 10%");
        ERC1155Collection collection = new ERC1155Collection(
            name,
            symbol,
            baseURI,
            msg.sender,
            royaltyFee
        );
        collection.transferOwnership(msg.sender);
        emit CollectionCreated(address(collection), msg.sender);
        return address(collection);
    }
} 