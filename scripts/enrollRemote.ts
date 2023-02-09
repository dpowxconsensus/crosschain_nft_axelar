const { ethers, network } = require("hardhat");

import { abi, bytecode } from "../artifacts/contracts/nft.sol/NFT.json";
import config from "../constants/config";

import deploy from "./../deploy/artifacts/deploy.json";

async function main() {
  console.info("Enrollment started ...");
  // setting remote for current network, we can create task for it
  const nftAddress = deploy[network.name];
  const [signer] = await ethers.getSigners();
  const nftContract = await ethers.getContractAt(abi, nftAddress, signer);
  // hard coding for fuji and goerli here

  let remoteChain;
  if (network.name == "fuji") remoteChain = "goerli";
  else remoteChain = "fuji";

  const remoteChainId = config[remoteChain].chainId;
  const remoteChainContractAddress = deploy[remoteChain];

  // const tx = await nftContract.setInteractorByChainId(
  //   remoteChainId,
  //   ethers.utils.solidityPack(["address"], [remoteChainContractAddress])
  // );

  // console.log("trusted remote: tx sent with tx hash ", tx.hash);
  // await tx.wait();
  // console.log("Added remote to  ", network.name, " to ", remoteChain);
}

main()
  .then(() => console.info("Enrollmented completed !!"))
  .catch(console.error);
