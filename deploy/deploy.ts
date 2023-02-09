const { ethers, upgrades, network } = require("hardhat");
import { readFile, writeFile } from "node:fs/promises";
import { access, constants, mkdir } from "node:fs";

import config from "./../constants/config";

const isFileExist = (path: string) => {
  return new Promise((resolve, reject) => {
    access(path, constants.F_OK, (err) => {
      if (err) return resolve(false);
      resolve(true);
    });
  });
};

async function main() {
  console.info("Deployment Started ...");
  // const [signer] = await ethers.getSigners();

  const NFT = await ethers.getContractFactory("NFT");
  const gatewayProxy = config[network.name].gatewayProxy;
  const axelarGasReceiverProxy = config[network.name].axelarGasReceiverProxy;

  // const nft = await NFT.deploy(gatewayProxy, axelarGasReceiverProxy);
  // await nft.deployed();
  // const Proxy = await ethers.getContractFactory("Proxy");
  // const nftProxy = await Proxy.deploy();
  // await nftProxy.deployed();
  // const params = ;
  // nftProxy.init(nft.address, signer.address, );

  const nft = await NFT.deploy(gatewayProxy, axelarGasReceiverProxy);
  await nft.deployed();

  console.log("NFT contract deployed to ", nft.address);

  const path = `${__dirname}/artifacts`;

  if (!(await isFileExist(`${path}`))) {
    await new Promise((resolve, reject) => {
      mkdir(path, { recursive: true }, (err) => {
        if (err) return reject("error while creating dir");
        resolve("created");
      });
    });
  }

  if (!(await isFileExist(`${path}/deploy.json`))) {
    await writeFile(`${path}/deploy.json`, "{}");
  }

  const prevDetails = await readFile(`${path}/deploy.json`, {
    encoding: "utf8",
  });

  const prevDetailsJson: { [network: string]: string } = await JSON.parse(
    prevDetails
  );
  let newDeployData = { ...prevDetailsJson, [network.name]: nft.address };
  await writeFile(`${path}/deploy.json`, JSON.stringify(newDeployData));
  console.log("Deploy file updated successfully!");
}

main()
  .then(() => console.info("Deploy complete !!"))
  .catch(console.error);
