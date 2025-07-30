// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BasicNft is ERC721 {
    string public constant TOKEN_URI =
        "https://ipfs.io/ipfs/bafkreiacfzqa3nw4jzrnkkk5xnm3bofoh3mpxastf4w4cy5rjlvuu5mfiy?filename=lab.json";
    uint256 private s_tokenCounter;

    constructor() ERC721("Doggo", "DOGY") {
        s_tokenCounter = 0;
    }

    function mintNft() public returns (uint256) {
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter++;
        return s_tokenCounter;
    }

    function tokenURI(uint256 /*tokenid*/) public view override returns (string memory) {
        return TOKEN_URI;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
