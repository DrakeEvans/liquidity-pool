import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
const {
  utils,
  utils: { parseEther, parseUnits, formatEther },
} = ethers;
// const { parseEther, parseUnits } = utils;
import { SpaceCoin, SpaceCoinIco, SpaceCoinWethPair, SpaceCoinRouter, WrappedEth } from "../../typechain";

async function deploy(contractName: string, args: any[] = []): Promise<any> {
  try {
    const factory = await ethers.getContractFactory(contractName);
    const contract = await factory.deploy(...args);
    await contract.deployed();
    return contract;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function setupContracts() {
  const [owner, ...signers] = await ethers.getSigners();
  const spaceCoin: SpaceCoin = await deploy("SpaceCoin", [parseEther("500000")]);
  const wrappedEther: WrappedEth = await deploy("WrappedEth");
  const spaceCoinIco: SpaceCoinIco = await deploy("SpaceCoinIco", [spaceCoin.address]);
  const SpaceCoinWethPair: SpaceCoinWethPair = await deploy("SpaceCoinWethPair", [
    spaceCoin.address,
    wrappedEther.address,
  ]);
  const spaceCoinRouter: SpaceCoinRouter = await deploy("SpaceCoinRouter", [
    spaceCoin.address,
    SpaceCoinWethPair.address,
    wrappedEther.address,
  ]);
  expect(SpaceCoinWethPair.address).to.equal(await spaceCoinRouter.spaceCoinWethPairAddress());
  await spaceCoin.transfer(spaceCoinIco.address, parseEther("500000")).then(tx => tx.wait());
  const balance = await spaceCoin.balanceOf(spaceCoinIco.address);
  expect(balance).to.equal(parseEther("500000"));
  await spaceCoinIco.movePhaseForward().then(tx => tx.wait());
  await spaceCoinIco.movePhaseForward().then(tx => tx.wait());
  const promises = signers.slice(0, 3).map(async (address, index) => {
    try {
      const wrappedEthPromise = wrappedEther
        .connect(address)
        .faucet(parseEther("5000"))
        .then(tx => tx.wait());
      await spaceCoinIco
        .connect(address)
        .purchaseSpaceCoin({ value: parseEther("1000") })
        .then(tx => tx.wait());
      const balance = await spaceCoin.balanceOf(address.address);
      expect(balance).to.equal(parseEther("5000").toString());
      await wrappedEthPromise;
      const wethBalance = await wrappedEther.balanceOf(address.address);
      expect(wethBalance).to.equal(parseEther("5000").toString());
    } catch (err) {
      throw err;
    }
  });
  await Promise.all(promises);
  return { spaceCoin, wrappedEther, spaceCoinIco, SpaceCoinWethPair, spaceCoinRouter, owner, signers };
}

describe("SpaceCoin Router", () => {
  it("Should allow user to add liquidity", async () => {
    const { spaceCoin, wrappedEther, spaceCoinIco, SpaceCoinWethPair, spaceCoinRouter, owner, signers } =
      await setupContracts();
    const amountSpaceCoin = parseEther("1000");
    const amountEth = parseEther("200");

    await spaceCoin
      .connect(signers[0])
      .increaseAllowance(spaceCoinRouter.address, amountSpaceCoin)
      .then(tx => tx.wait());

    await spaceCoin
      .connect(signers[1])
      .increaseAllowance(spaceCoinRouter.address, amountSpaceCoin)
      .then(tx => tx.wait());

    await spaceCoin
      .connect(signers[2])
      .increaseAllowance(spaceCoinRouter.address, amountSpaceCoin.mul(2))
      .then(tx => tx.wait());

    // Give router access to weth
    await wrappedEther
      .connect(signers[0])
      .increaseAllowance(spaceCoinRouter.address, amountSpaceCoin)
      .then(tx => tx.wait());

    await wrappedEther
      .connect(signers[1])
      .increaseAllowance(spaceCoinRouter.address, amountSpaceCoin)
      .then(tx => tx.wait());

    await wrappedEther
      .connect(signers[2])
      .increaseAllowance(spaceCoinRouter.address, amountSpaceCoin.mul(2))
      .then(tx => tx.wait());

    await spaceCoinRouter
      .connect(signers[0])
      .addLiquidity(amountSpaceCoin, amountEth, "0", "0", signers[0].address, 50000000000)
      .then(tx => tx.wait());
    await spaceCoinRouter
      .connect(signers[1])
      .addLiquidity(amountSpaceCoin, amountEth, "0", "0", signers[1].address, 50000000000)
      .then(tx => tx.wait());
    await spaceCoinRouter
      .connect(signers[2])
      .addLiquidity(amountSpaceCoin.mul(2), amountEth.mul(2), "0", "0", signers[2].address, 50000000000)
      .then(tx => tx.wait());

    expect(await SpaceCoinWethPair.wethReserves()).to.equal(parseEther("800"));
    expect(await SpaceCoinWethPair.spaceCoinReserves()).to.equal(parseEther("4000"));
    const balance0 = await SpaceCoinWethPair.balanceOf(signers[0].address);
    const assertion = await SpaceCoinWethPair.sqrt(parseEther("1000").mul(parseEther("200")));
    expect(balance0).to.equal(assertion);

    const swap = async (signer: SignerWithAddress) => {
      const oldBalance = await signer.getBalance();

      const oldAmountSpaceCoin = await spaceCoin.balanceOf(signer.address);

      const amountSwappedSpaceCoin0 = await spaceCoinRouter
        .connect(signer)
        .swapWethForSpaceCoin("0", parseEther("100"), signer.address)
        .then(tx => tx.wait());
      const newAmountSpaceCoin = await spaceCoin.balanceOf(signer.address);

      const newBalance = await signer.getBalance();

      expect(newBalance).to.be.lt(oldBalance);
      expect(oldAmountSpaceCoin).to.be.lt(newAmountSpaceCoin);
    };

    await swap(signers[0]);
    await swap(signers[1]);
    await swap(signers[2]);

    const oldBalance = await SpaceCoinWethPair.balanceOf(signers[0].address);

    const amountLP = parseEther("400");
    await SpaceCoinWethPair.connect(signers[0])
      .increaseAllowance(spaceCoinRouter.address, amountLP)
      .then(tx => tx.wait());
    await spaceCoinRouter
      .connect(signers[0])
      .removeLiquidity(amountLP, "0", "0", signers[0].address, 500000000000000)
      .then(tx => tx.wait());
    const newBalance = await SpaceCoinWethPair.balanceOf(signers[0].address);
    expect(oldBalance).to.be.gt(newBalance);
  });
});
