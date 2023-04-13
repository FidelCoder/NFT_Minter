// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

error Error__PriceLowerThanOne();
error Error__NotTokenOwner();
error Error__ContractNotApproved();
error Error__NotEnoughEther();
error Error__NFTTransferFailed();
error Error__PaymentFailed();
error Error__AlreadySold();
error Error__ItemDontExist();
error Error__AlreadyListed();

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

    event ItemDeleted(address indexed owner, uint256 indexed itemId);

    // sets deployer as the account that receives the fees and the fee percentage
    constructor(uint256 _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }

    /// @dev checks if price is valid
    /// @notice price needs be at least 1 ether to prevent unexpected bugs and issues when calculating sales Fee
    modifier isValidPrice(uint price) {
        if (price < 1 ether) {
            revert Error__PriceLowerThanOne();
        }
        _;
    }

    modifier isOwnerAndApproved(uint _tokenId, IERC721 _nft) {
        if (_nft.ownerOf(_tokenId) != msg.sender) {
            revert Error__NotTokenOwner();
        }
        if (_nft.getApproved(_tokenId) != address(this)) {
            revert Error__ContractNotApproved();
        }
        _;
    }

    modifier isItemOwner(uint256 _itemId) {
        if (items[_itemId].seller != msg.sender) {
            revert Error__NotTokenOwner();
        }
        _;
    }

    /// @dev Make item to offer on the marketplace
    /// @param _nft the address of the contract where the NFT was minted
    /// @param _tokenId the id of the NFT, comes from the NFT contract
    function makeItem(
        IERC721 _nft,
        uint256 _tokenId,
        uint256 _price
    ) external isValidPrice(_price) isOwnerAndApproved(_tokenId, _nft) {
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

    function removeItem(uint256 _itemId) external isItemOwner(_itemId) {
        //this returns everything to default
        delete items[_itemId];
        //emit deleted item
        emit ItemDeleted(msg.sender, _itemId);
    }

    /// @dev purchase an item from the marketplace
    /// @notice sales fee is calculated by multiplying the sales fee percentage to the price of the item
    function purchaseItem(uint256 _itemId) external payable nonReentrant {
        if (_itemId <= 0 || _itemId > itemCount) {
            revert Error__ItemDontExist();
        }

        if (items[_itemId].sold == true) {
            revert Error__AlreadySold();
        }

        uint256 salesFee = feePercent > 0 ? getSalesFee(_itemId) : 0;
        if (msg.value != (items[_itemId].price + salesFee)) {
            revert Error__NotEnoughEther();
        }
        Item storage item = items[_itemId];
        address seller = item.seller;
        // update seller to be the buyer
        item.seller = payable(msg.sender);
        item.sold = true;

        item.nft.transferFrom(address(this), item.seller, item.tokenId);
        if (item.nft.ownerOf(item.tokenId) != msg.sender) {
            revert Error__NFTTransferFailed();
        }

        (bool success, ) = payable(seller).call{value: item.price}("");
        if (!success) {
            revert Error__PaymentFailed();
        }
        if (salesFee > 0) {
            (bool sent, ) = feeAccount.call{value: salesFee}("");
            if (!sent) {
                revert Error__PaymentFailed();
            }
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

    /**
     * @dev allows someone to resell a token they have purchased,
     
    */
    function relistItem(
        uint256 _itemId,
        uint256 _price
    )
        external
        isValidPrice(_price)
        isOwnerAndApproved(items[_itemId].tokenId, items[_itemId].nft)
    {
        if (items[_itemId].sold == false) {
            revert Error__AlreadyListed();
        }
        if (items[_itemId].seller != msg.sender) {
            revert Error__NotTokenOwner();
        }

        Item storage currentItem = items[_itemId];
        currentItem.sold = false;
        currentItem.price = _price;
        // transfer nft
        currentItem.nft.transferFrom(
            msg.sender,
            address(this),
            currentItem.tokenId
        );
        if (currentItem.nft.ownerOf(currentItem.tokenId) != address(this)) {
            revert Error__NFTTransferFailed();
        }
        // emit Offered event
        emit Offered(
            _itemId,
            address(currentItem.nft),
            currentItem.tokenId,
            _price,
            msg.sender
        );
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
