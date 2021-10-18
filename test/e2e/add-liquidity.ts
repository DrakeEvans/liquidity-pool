import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
const {
  utils,
  utils: { parseEther, parseUnits, formatEther },
} = ethers;
// const { parseEther, parseUnits } = utils;
import { SpaceCoin, SpaceCoinIco, SpaceCoinEthPair, SpaceCoinRouter } from "../../typechain";

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
  const spaceCoinIco: SpaceCoinIco = await deploy("SpaceCoinIco", [spaceCoin.address]);
  const spaceCoinEthPair: SpaceCoinEthPair = await deploy("SpaceCoinEthPair", [spaceCoin.address]);
  const spaceCoinRouter: SpaceCoinRouter = await deploy("SpaceCoinRouter", [
    spaceCoin.address,
    spaceCoinEthPair.address,
  ]);
  expect(spaceCoinEthPair.address).to.equal(await spaceCoinRouter.spaceCoinEthPairAddress());
  await spaceCoinEthPair.setRouterAddresses(spaceCoinRouter.address, true).then(tx => tx.wait());
  await spaceCoin.transfer(spaceCoinIco.address, parseEther("500000")).then(tx => tx.wait());
  const balance = await spaceCoin.balanceOf(spaceCoinIco.address);
  expect(balance).to.equal(parseEther("500000"));
  await spaceCoinIco.movePhaseForward().then(tx => tx.wait());
  await spaceCoinIco.movePhaseForward().then(tx => tx.wait());
  const promises = signers.slice(0, 3).map(async (address, index) => {
    try {
      await spaceCoinIco
        .connect(address)
        .purchaseSpaceCoin({ value: parseEther("1000") })
        .then(tx => tx.wait());
      const balance = await spaceCoin.balanceOf(address.address);
      expect(balance).to.equal(parseEther("5000").toString());
    } catch (err) {
      throw err;
    }
  });
  await Promise.all(promises);
  return { spaceCoin, spaceCoinIco, spaceCoinEthPair, spaceCoinRouter, owner, signers };
}

describe("SpaceCoin Router", () => {
  it("Should allow user to add liquidity", async () => {
    const { spaceCoin, spaceCoinIco, spaceCoinEthPair, spaceCoinRouter, owner, signers } = await setupContracts();
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

    const output = await spaceCoinRouter
      .connect(signers[0])
      .addLiquidity(amountSpaceCoin, "0", "0", signers[0].address, 50000000000, { value: amountEth })
      .then(tx => tx.wait());
    await spaceCoinRouter
      .connect(signers[1])
      .addLiquidity(amountSpaceCoin, "0", "0", signers[1].address, 50000000000, { value: amountEth })
      .then(tx => tx.wait());
    await spaceCoinRouter
      .connect(signers[2])
      .addLiquidity(amountSpaceCoin.mul(2), "0", "0", signers[2].address, 50000000000, { value: amountEth.mul(2) })
      .then(tx => tx.wait());

    expect(await spaceCoinEthPair.ethReserves()).to.equal(parseEther("800"));
    expect(await spaceCoinEthPair.spaceCoinReserves()).to.equal(parseEther("4000"));
    const balance0 = await spaceCoinEthPair.balanceOf(signers[0].address);
    const assertion = await spaceCoinEthPair.sqrt(parseEther("1000").mul(parseEther("200")));
    expect(balance0).to.equal(assertion);

    const swap = async (signer: SignerWithAddress) => {
      const oldBalance = await signer.getBalance();

      const oldAmountSpaceCoin = await spaceCoin.balanceOf(signer.address);

      const amountSwappedSpaceCoin0 = await spaceCoinRouter
        .connect(signer)
        .swapEthForSpaceCoin("0", signer.address, { value: parseEther("100") })
        .then(tx => tx.wait());
      const newAmountSpaceCoin = await spaceCoin.balanceOf(signer.address);

      const newBalance = await signer.getBalance();

      expect(newBalance).to.be.lt(oldBalance);
      expect(oldAmountSpaceCoin).to.be.lt(newAmountSpaceCoin);
    };

    await swap(signers[0]);
    await swap(signers[1]);
    await swap(signers[2]);

    const oldBalance = await spaceCoinEthPair.balanceOf(signers[0].address);

    const amountLP = parseEther("400");
    await spaceCoinEthPair
      .connect(signers[0])
      .increaseAllowance(spaceCoinRouter.address, amountLP)
      .then(tx => tx.wait());
    await spaceCoinRouter
      .connect(signers[0])
      .removeLiquidity(amountLP, "0", "0", signers[0].address, 500000000000000)
      .then(tx => tx.wait());
    const newBalance = await spaceCoinEthPair.balanceOf(signers[0].address);
    expect(oldBalance).to.be.gt(newBalance);
  });
});
