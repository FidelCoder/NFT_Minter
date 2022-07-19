// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";

contract NFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, PullPayment {
    using Counters for Counters.Counter;

    // counts the number of NFTs
    Counters.Counter private _tokenIdCounter;

    // Maximum number of NFTs that can be created
    uint256 public constant TOTAL_SUPPLY = 10_000;

    /// @dev Base token URI used as a prefix by tokenURI().
    string public baseTokenURI;

    constructor() ERC721("NFT", "VMS") {
        baseTokenURI = "";
    }

    function safeMint(address to, string memory uri) public payable {
        // get current token counter to keep track of NFTs
        uint256 tokenId = _tokenIdCounter.current();
        require(tokenId < TOTAL_SUPPLY, "Max supply reached");

        _tokenIdCounter.increment();
        // mints the NFT
        _safeMint(to, tokenId);
        // sets link to URI for the NFT
        _setTokenURI(tokenId, uri);
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // deletes the URI for the NFT
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    // sets the URI for the NFT
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

     /// @dev Sets the base token URI prefix.
    function setBaseTokenURI(string memory _baseTokenURI) public onlyOwner {
        baseTokenURI = _baseTokenURI;
    }

    /// @dev Overridden in order to make it an onlyOwner function
    function withdrawPayments(address payable payee) public override onlyOwner virtual {
        super.withdrawPayments(payee);
    }

    /// @dev Overridden in order to allow the NFT owner to make their NFT available on the market
    function setApprovalForAll(address operator, bool approved) public virtual override(ERC721) {
        super._setApprovalForAll(msg.sender, operator, approved);
    }

}

