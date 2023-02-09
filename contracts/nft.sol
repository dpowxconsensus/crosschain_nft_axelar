// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import {IERC20} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol";
import {IAxelarGasService} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import {IAxelarGateway} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import {AxelarExecutable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import {Upgradable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/upgradable/Upgradable.sol";
import {StringToAddress, AddressToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/AddressString.sol";

contract NFT is
    ERC721,
    ERC721URIStorage,
    ERC721Burnable,
    AxelarExecutable,
    Upgradable
{
    event SendNFTCrossChain(
        address from,
        address to,
        string dstChain,
        uint256 tokenId
    );

    event NFTReceivedFromChain(
        address from,
        address to,
        string srcChain,
        uint256 tokenId
    );

    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    using StringToAddress for string;
    using AddressToString for address;

    error AlreadyInitialized();

    mapping(uint256 => bytes) public original; // abi.encode(originaChain, operator, tokenId);
    string public chainName; // To check if we are the source chain.
    IAxelarGasService public gasReceiver;

    constructor(
        address gateway_,
        address gasReceiver_
    ) ERC721("NFT", "SNFT") AxelarExecutable(gateway_) {
        gasReceiver = IAxelarGasService(gasReceiver_);
    }

    function _setup(bytes calldata params) internal override {
        string memory chainName_ = abi.decode(params, (string));
        if (bytes(chainName).length != 0) revert AlreadyInitialized();
        chainName = chainName_;
    }

    function _safeMint(address to, string memory uri) internal {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function safeMint(address to, string memory uri) public payable {
        require(msg.value >= 1 wei, "1 wei required to mint");
        _safeMint(to, uri);
    }

    // The following functions are overrides required by Solidity.

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    //TRANSFER
    function transferNFTCrossChain(
        string memory _dstChain,
        address _dstAddress, // destination contract address
        address to,
        uint256 tokenId
    ) public payable {
        require(msg.value > 0, "pls send ether for gas fees");

        // encode the payload with the number of pings
        bytes memory payload = abi.encode(
            tokenId,
            tokenURI(tokenId),
            to,
            msg.sender,
            _dstAddress
        );
        _burn(tokenId); // burn the nft on src chain
        string memory _dstStringAddress = _dstAddress.toString();
        gasReceiver.payNativeGasForContractCall{value: msg.value}(
            address(this),
            _dstChain,
            _dstStringAddress,
            payload,
            msg.sender
        );

        gateway.callContract(_dstChain, _dstStringAddress, payload);
        emit SendNFTCrossChain(msg.sender, to, _dstChain, tokenId);
    }

    // This is automatically executed by Axelar Microservices since gas was payed for.
    function _execute(
        string calldata _srcChain,
        string calldata /*sourceAddress*/,
        bytes calldata payload
    ) internal override {
        // decode the tokenId from src chain here
        (
            uint256 tokenId,
            string memory tokenUri,
            address to,
            address from,
            address _dstAddress
        ) = abi.decode(payload, (uint, string, address, address, address));
        require(_dstAddress == address(this), "Invalid DstAddress");

        // mint nft on dst chain (with same tokenid or with incremented tokenid)
        _safeMint(to, tokenUri);
        emit NFTReceivedFromChain(from, to, _srcChain, tokenId);
    }

    function contractId() external pure returns (bytes32) {
        return "NFT contract";
    }
}
