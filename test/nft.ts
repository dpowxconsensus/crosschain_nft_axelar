import { expect } from "chai";
const { ethers, upgrades, network } = require("hardhat");
import { MaxUint256 } from "@ethersproject/constants";

const { defaultAbiCoder, arrayify, keccak256, toUtf8Bytes } = ethers.utils;

describe("NFT", function () {
  let threshold = 1;
  let signer;
  let operator;
  let accounts;
  let localChain = "local";
  let remoteChain = "remote";

  let gatewayProxy;
  let axelarGasReceiverProxy;

  let localNFT;
  let remoteNFT;

  const _dstGasLimit = 1000000;
  const gasLimit = 1000000;

  const _deployGateway = async () => {
    const params = arrayify(
      defaultAbiCoder.encode(
        ["address[]", "uint8", "bytes"],
        [[signer.address, operator.address] /* Admin lists */, threshold, "0x"]
      )
    );

    // deploying AUTH -> second account is operator
    const AUTH = await ethers.getContractFactory("AxelarAuthWeighted");
    const auth = await AUTH.deploy([
      defaultAbiCoder.encode(
        ["address[]", "uint256[]", "uint256"],
        [[operator.address], [1], 1]
      ),
    ]);
    await auth.deployed();

    // deploying tokendeployer
    const TokenDeployer = await ethers.getContractFactory("TokenDeployer");
    const tokenDeployer = await TokenDeployer.deploy();
    await tokenDeployer.deployed();

    // deploying gateway
    const AxelarGateway = await ethers.getContractFactory("AxelarGateway");
    const gateway = await AxelarGateway.deploy(
      auth.address,
      tokenDeployer.address
    );
    await gateway.deployed();

    const AxelarGatewayProxy = await ethers.getContractFactory(
      "AxelarGatewayProxy"
    );
    gatewayProxy = await AxelarGatewayProxy.deploy(gateway.address, params);
    await gatewayProxy.deployed();
    await (await auth.transferOwnership(gatewayProxy.address)).wait();
  };

  const _deployGasReceiver = async () => {
    const AxelarGasReceiver = await ethers.getContractFactory(
      "AxelarGasService"
    );
    const axelarGasReceiver = await AxelarGasReceiver.deploy(signer.address);
    await axelarGasReceiver.deployed();

    const AxelarGasReceiverProxy = await ethers.getContractFactory(
      "AxelarGasServiceProxy"
    );
    axelarGasReceiverProxy = await AxelarGasReceiverProxy.deploy();
    await axelarGasReceiverProxy.deployed();

    await axelarGasReceiverProxy.init(
      axelarGasReceiver.address,
      signer.address,
      "0x"
    );
  };

  before(async () => {
    [signer, operator, ...accounts] = await ethers.getSigners();
    await _deployGateway();
    await _deployGasReceiver();

    const NFT = await ethers.getContractFactory("NFT");
    const params = await ethers.utils.defaultAbiCoder.encode(
      ["string"],
      [localChain]
    );

    localNFT = await NFT.deploy(
      gatewayProxy.address,
      axelarGasReceiverProxy.address
    );
    await localNFT.deployed();

    remoteNFT = await NFT.deploy(
      gatewayProxy.address,
      axelarGasReceiverProxy.address
    );
    await remoteNFT.deployed();

    // const nft = await NFT.deploy(
    //   gatewayProxy.address,
    //   axelarGasReceiverProxy.address
    // );
    // await nft.deployed();
    // const Proxy = await ethers.getContractFactory("Proxy");
    // localNFT = await Proxy.deploy();
    // await localNFT.deployed();
    // await (await localNFT.init(nft.address, signer.address, params)).wait();

    // upgrades.deployProxy(NFT, [params], {
    //   initializer: "_setup",
    //   constructorArgs: [gateway, gasReceiver],
    //   unsafeAllow: ["constructor", "delegatecall"],
    // });
    // await localNFT._setup(params);

    // set remote contract with chainId
    // await localNFT.setInteractorByChainId(
    //   remoteChainId,
    //   ethers.utils.solidityPack(["address"], [remoteNFT.address])
    // );

    // await remoteNFT.setInteractorByChainId(
    //   localChainId,
    //   ethers.utils.solidityPack(["address"], [localNFT.address])
    // );
  });
  beforeEach(async function () {});

  it("connector Setup and nft deployment to chains", () => {});
  it("nft mint", async () => {
    await localNFT.connect(signer).safeMint(signer.address, "URI", {
      value: 1, // 1wei
    });
    expect(await localNFT.ownerOf(0)).to.be.equal(signer.address);
  });

  it("Cross Chain NFT Transfer, Should mint tokenId in the destination chain", async function () {
    // // mint nft on local chain
    await localNFT.safeMint(signer.address, "URI", {
      value: 1, // 1wei
    });

    expect(await localNFT.ownerOf(0)).to.be.equal(signer.address);

    const tx = await localNFT.transferNFTCrossChain(
      remoteChain,
      remoteNFT.address,
      signer.address,
      0,
      { value: 1 }
    );
    const ok = await tx.wait();
    // console.log(ok);

    // const payload =
    //   "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000008a791620dd6260079bf849dc5567adc3f2fdc31800000000000000000000000000000000000000000000000000000000000000035552490000000000000000000000000000000000000000000000000000000000";
    // const payload = ok.events[2].data;
    // console.log(payload);

    // const decode = defaultAbiCoder.decode(
    //   [
    //     "address",
    //     "string",
    //     "string",
    //     "bytes32",
    //     ["uint", "string", "address", "address", "address"],
    //   ],
    //   payload
    // );
    // console.log(decode);

    // const py = defaultAbiCoder.decode()

    // console.log(decode);

    // const input = defaultAbiCoder.encode(["bytes", "bytes"], payload, payload);
    // console.log(input);

    // await gatewayProxy.execute(input);

    // expect(await remoteNFT.ownerOf(0)).to.be.equal(signer.address);
  });
});
