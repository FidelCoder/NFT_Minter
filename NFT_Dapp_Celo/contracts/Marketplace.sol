// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract Marketplace is ReentrancyGuard, ERC721Holder {
    /// @dev Variables
    address payable public immutable feeAccount; // the account that receives fees
    uint256 public immutable feePercent; // the fee percentage on sales
    uint256 public itemCount; // how many items were listed in the market

    /// @dev structure of marketplace items
    struct Item {
        IERC721 nft;
        uint256 tokenId;
        uint256 price;
        address payable seller;
        bool sold;
    }

    // itemId -> Item
    mapping(uint256 => Item) public items;

    /// @dev event for everytime an offer is made
    event Offered(
        uint256 itemId,
        address indexed nft,
        uint256 tokenId,
        uint256 price,
        address indexed seller
    );
    /// @dev event for everytime an item is bought
    event Bought(
        uint256 itemId,
        address indexed nft,
        uint256 tokenId,
        uint256 price,
        address indexed seller,
        address indexed buyer
    );

    // sets deployer as the account that receives the fees and the fee percentage
    constructor(uint256 _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }


    /// @dev checks if price is valid
    /// @notice price needs be at least 1 ether to prevent unexpected bugs and issues when calculating sales Fee
    modifier isValidPrice(uint price) {
        require(price >= 1 ether, "price needs to be at least one CELO");
        _;
    }

    /// @dev Make item to offer on the marketplace
    /// @param _nft the address of the contract where the NFT was minted
    /// @param _tokenId the id of the NFT, comes from the NFT contract
    function makeItem(
        ERC721 _nft,
        uint256 _tokenId,
        uint256 _price
    ) external isValidPrice(_price) {
        require(
            _nft.ownerOf(_tokenId) == msg.sender &&
                _nft.getApproved(_tokenId) == address(this),
            "Caller isn't the Token owner or the contract hasn't been approved"
        );

        // increment itemCount
        itemCount++;
        // transfer nft
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        // add new item to items mapping
        items[itemCount] = Item(
            _nft,
            _tokenId,
            _price,
            payable(msg.sender),
            false
        );
        // emit Offered event
        emit Offered(itemCount, address(_nft), _tokenId, _price, msg.sender);
    }

    /// @dev purchase an item from the marketplace
    /// @notice sales fee is calculated by multiplying the sales fee percentage to the price of the item
    function purchaseItem(uint256 _itemId) external payable nonReentrant {
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(!items[_itemId].sold, "item already sold");

        uint256 salesFee = feePercent > 0 ? getSalesFee(_itemId) : 0;
        require(
            msg.value == (items[_itemId].price + salesFee),
            "not enough ether to cover item price and market fee"
        );
        Item storage item = items[_itemId];
        address seller = item.seller;
        // update seller to be the buyer
        item.seller = payable(msg.sender);
        item.sold = true;

        item.nft.transferFrom(address(this), item.seller, item.tokenId);
        require(
            item.nft.ownerOf(item.tokenId) == msg.sender,
            "Transfer of item failed"
        );

        (bool success, ) = payable(seller).call{value: item.price}("");
        require(success, "Transfer of payment failed");
        if (salesFee > 0) {
            (bool sent, ) = feeAccount.call{value: salesFee}("");
            require(sent, "Transfer of sales fee failed");
        }

        // emits Bought event
        emit Bought(
            _itemId,
            address(item.nft),
            item.tokenId,
            item.price,
            item.seller,
            msg.sender
        );
    }

    /// @dev returns the sales fee on an item
    function getSalesFee(uint _itemId) public view returns (uint) {
        if (feePercent > 0) {
            return (items[_itemId].price * feePercent) / 100;
        } else {
            return 0;
        }
    }

    /* allows someone to resell a token they have purchased,
     use itemId on the frontend instead of tokenId to call this function */
    function relistItem(uint256 tokenId, uint256 price)
        external
        isValidPrice(price)
    {
        require(items[tokenId].sold, "Item is already listed");
        require(
            items[tokenId].seller == msg.sender,
            "Only item owner can perform this operation"
        );
        items[tokenId].sold = false;
        items[tokenId].price = price;
    }

    /**
     * @dev Returns all unsold market items
     *
     */
    function fetchMarketItems() public view returns (Item[] memory) {
        uint256 currentIndex = 0;

        Item[] memory allItems = new Item[](itemCount);
        for (uint256 i = 1; i <= itemCount; i++) {
            if (!items[i].sold) {
                allItems[currentIndex] = items[i];
                currentIndex += 1;
            }
        }

        return allItems;
    }
}
