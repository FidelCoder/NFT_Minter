// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

contract Marketplace is ReentrancyGuard, IERC721Receiver {
    using SafeMath for uint256;

    // Variables
    address payable public immutable feeAccount; // the account that receives fees
    uint256 public immutable feePercent; // the fee percentage on sales
    uint256 public itemCount; // how many items were listed in the market
    uint256 private salesFee;

    // Structure of marketplace items
    struct Item {
        address nft;
        uint256 tokenId;
        uint256 price;
        address payable seller;
        bool sold;
    }

    // ItemID -> Item
    mapping(uint256 => Item) public items;

    // Events
    event Offered(
        uint256 itemId,
        address indexed nft,
        uint256 tokenId,
        uint256 price,
        address indexed seller
    );
    event Bought(
        uint256 itemId,
        address indexed nft,
        uint256 tokenId,
        uint256 price,
        address indexed seller,
        address indexed buyer
    );

    // Sets deployer as the account that receives the fees and the fee percentage
    constructor(uint256 _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }

    // Modifier to validate price
    modifier isValidPrice(uint256 price) {
        require(price >= 1 ether, "Price needs to be at least one CELO");
        _;
    }

    // Modifier to ensure the caller is the owner and the contract is approved to transfer the token
    modifier isOwnerAndApproved(uint256 _tokenId, address _nft) {
        require(
            IERC721(_nft).ownerOf(_tokenId) == msg.sender &&
                IERC721(_nft).getApproved(_tokenId) == address(this),
            "Caller isn't the token owner or the contract hasn't been approved"
        );
        _;
    }

    // Function to receive NFTs
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // Make item to offer on the marketplace
    function makeItem(
        address _nft,
        uint256 _tokenId,
        uint256 _price
    ) external isValidPrice(_price) isOwnerAndApproved(_tokenId, _nft) {
        itemCount++;
        IERC721(_nft).transferFrom(msg.sender, address(this), _tokenId);
        items[itemCount] = Item(_nft, _tokenId, _price, payable(msg.sender), false);
        emit Offered(itemCount, _nft, _tokenId, _price, msg.sender);
    }

    // Purchase an item from the marketplace
    function purchaseItem(uint256 _itemId) external payable nonReentrant {
        require(_itemId > 0 && _itemId <= itemCount, "Item doesn't exist");
        require(!items[_itemId].sold, "Item already sold");

        salesFee = getSalesFee(_itemId);
        require(
            msg.value == (items[_itemId].price + salesFee),
            "Insufficient funds to cover item price and market fee"
        );

        Item storage item = items[_itemId];
        item.sold = true;

        IERC721(item.nft).transferFrom(address(this), msg.sender, item.tokenId);

        (bool success, ) = item.seller.call{value: item.price}("");
        require(success, "Payment transfer failed");

        if (salesFee > 0) {
            (bool sent, ) = feeAccount.call{value: salesFee}("");
            require(sent, "Transfer of sales fee failed");
        }

        emit Bought(_itemId, item.nft, item.tokenId, item.price, item.seller, msg.sender);
    }

    // Returns the sales fee on an item
    function getSalesFee(uint256 _itemId) public view returns (uint256) {
        return (items[_itemId].price * feePercent) / 100;
    }

    // Allows someone to relist a token they have purchased
    function relistItem(uint256 _itemId, uint256 _price)
        external
        isValidPrice(_price)
        nonReentrant
    {
        require(items[_itemId].sold, "Item is not sold");
        require(items[_itemId].seller == msg.sender, "Only item owner can relist");
        
        Item storage currentItem = items[_itemId];
        currentItem.sold = false;
        currentItem.price = _price;

        IERC721(currentItem.nft).transferFrom(msg.sender, address(this), currentItem.tokenId);

        emit Offered(_itemId, currentItem.nft, currentItem.tokenId, _price, msg.sender);
    }

    // Returns all unsold market items
    function fetchMarketItems() public view returns (Item[] memory) {
        uint256 unsoldItemCount = 0;

        for (uint256 i = 1; i <= itemCount; i++) {
            if (!items[i].sold) {
                unsoldItemCount++;
            }
        }

        Item[] memory unsoldItems = new Item[](unsoldItemCount);
        uint256 currentIndex = 0;

        for (uint256 i = 1; i <= itemCount; i++) {
            if (!items[i].sold) {
                unsoldItems[currentIndex] = items[i];
                currentIndex++;
            }
        }

        return unsoldItems;
    }
}
