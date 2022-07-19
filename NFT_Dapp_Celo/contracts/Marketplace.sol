// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract Marketplace is ReentrancyGuard, ERC721Holder {
    // Variables
    address payable public immutable feeAccount; // the account that receives fees
    uint256 public immutable feePercent; // the fee percentage on sales
    uint256 public itemCount; // how many items were listed in the market

    // structure of marketplace items
    struct Item {
        uint256 itemId;
        IERC721 nft;
        uint256 tokenId;
        uint256 price;
        address payable seller;
        bool sold;
    }

    // itemId -> Item
    mapping(uint256 => Item) public items;

    // event for everytime an offer is made
    event Offered(
        uint256 itemId,
        address indexed nft,
        uint256 tokenId,
        uint256 price,
        address indexed seller
    );
    // event for everytime an item is bought
    event Bought(
        uint256 itemId,
        address indexed nft,
        uint256 tokenId,
        uint256 price,
        address indexed seller,
        address indexed buyer
    );

    // sets up account that receives the fees and the fee percentage
    constructor(uint256 _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }

    // Make item to offer on the marketplace
    // @param nft the address of the contract where the NFT was minted
    // @param tokenId the id of the NFT, comes from the NFT contract
    function makeItem(
        ERC721 _nft,
        uint256 _tokenId,
        uint256 _price
    ) external nonReentrant {
        require(_price > 0, "Price must be greater than zero");
        // increment itemCount
        itemCount++;
        // transfer nft
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        // add new item to items mapping
        items[itemCount] = Item(
            itemCount,
            _nft,
            _tokenId,
            _price,
            payable(msg.sender),
            false
        );
        // emit Offered event
        emit Offered(itemCount, address(_nft), _tokenId, _price, msg.sender);
    }

    function purchaseItem(uint256 _itemId) external payable nonReentrant {
        uint256 _totalPrice = (items[_itemId].price * (100 + feePercent)) / 100;
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(
            msg.value >= _totalPrice,
            "not enough ether to cover item price and market fee"
        );
        require(!item.sold, "item already sold");
        // pay seller and feeAccount
        item.seller.transfer(item.price);
        feeAccount.transfer(_totalPrice - item.price);
        // update item to sold
        // item.sold = true;
        // transfer nft to buyer
        // item.nft.transferFrom(address(this), msg.sender, item.tokenId);
        // emit Bought event
        emit Bought(
            _itemId,
            address(item.nft),
            item.tokenId,
            item.price,
            item.seller,
            msg.sender
        );
        // update seller to be the buyer
        item.seller = payable(msg.sender);
    }

    /* allows someone to resell a token they have purchased,
     use itemId on the frontend instead of tokenId to call this function */
    function relistItem(uint256 tokenId, uint256 price) external nonReentrant {
        require(
            items[tokenId].seller == msg.sender,
            "Only item owner can perform this operation"
        );
        items[tokenId].sold = false;
        items[tokenId].price = price;
    }

    /* Returns all unsold market items */
    function fetchMarketItems() public view returns (Item[] memory) {
        uint256 currentIndex = 0;

        Item[] memory allItems = new Item[](itemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            uint256 currentId = items[i + 1].itemId;
            Item storage currentItem = items[currentId];
            allItems[currentIndex] = currentItem;
            currentIndex += 1;
        }

        return allItems;
    }
}
