import { expect } from "chai";
import { ethers } from "hardhat";
import { SpaceCoin__factory } from "../typechain/factories/SpaceCoin__factory";

const deploySpaceCoin = async (initialSupply: number) => {
  const [owner, ...addresses] = await ethers.getSigners();
  const spaceCoin = await new SpaceCoin__factory(owner).deploy(initialSupply);
  await spaceCoin.deployed();
  return spaceCoin;
};

describe("SpaceCoin Contract", () => {
  it("Contract should deploy unpaused", async () => {
    const spaceCoin = await deploySpaceCoin(500000);
    expect(await spaceCoin.paused()).to.equal(false);
  });
  it("Initial Supply and Cap should be equal to constructor input", async () => {
    const initialSupply = 500000;
    const [owner, ...addresses] = await ethers.getSigners();
    const spaceCoin = await deploySpaceCoin(initialSupply);
    expect(await spaceCoin.cap()).to.equal(initialSupply);
    expect(await spaceCoin.balanceOf(owner.address)).to.equal(initialSupply);
  });
  it("Should set treasury address to owner by default", async () => {
    const [owner, ...addresses] = await ethers.getSigners();
    const spaceCoin = await deploySpaceCoin(500000);
    const treasuryAddress = await spaceCoin.treasuryAddress();
    expect(treasuryAddress).to.equal(owner.address);
  });
  it("Should set reinvestment tax off by default", async () => {
    const [owner, ...addresses] = await ethers.getSigners();
    const spaceCoin = await deploySpaceCoin(500000);
    const reinvestmentTax = await spaceCoin.reinvestmentTax();
    expect(reinvestmentTax).to.equal(false);
  });
  describe("setTreasuryAddress function", () => {
    it("Should set treasury address when called by owner", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoin = await deploySpaceCoin(500000);
      expect(await spaceCoin.treasuryAddress()).to.equal(owner.address);
      await spaceCoin.setTreasuryAddress(addresses[1].address).then((tx: any) => tx.wait());
      expect(await spaceCoin.treasuryAddress()).to.equal(addresses[1].address);
    });
    it("Should be reverted when not called by owner", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoin = await deploySpaceCoin(500000);
      expect(await spaceCoin.treasuryAddress()).to.equal(owner.address);
      const txPromise = spaceCoin
        .connect(addresses[1])
        .setTreasuryAddress(addresses[1].address)
        .then((tx: any) => tx.wait());
      await expect(txPromise).to.be.reverted;
    });
  });
  describe("startReinvestment function", () => {
    it("Should set reinvestment to true", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoin = await deploySpaceCoin(500000);
      await spaceCoin.startReinvestment().then((tx: any) => tx.wait());
      await expect(await spaceCoin.reinvestmentTax()).to.be.true;
    });
    it("Should be reverted when reinvestment tax already started", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoin = await deploySpaceCoin(500000);
      await spaceCoin.startReinvestment().then((tx: any) => tx.wait());
      const secondAttemptPromise = spaceCoin.startReinvestment().then((tx: any) => tx.wait());
      await expect(secondAttemptPromise).to.be.reverted;
    });
    it("Should be reverted when called by non-owner", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoin = await deploySpaceCoin(500000);
      await spaceCoin.startReinvestment().then((tx: any) => tx.wait());
      const secondAttemptPromise = spaceCoin
        .connect(addresses[1])
        .startReinvestment()
        .then((tx: any) => tx.wait());
      await expect(secondAttemptPromise).to.be.reverted;
    });
  });
  describe("endReinvestment function", () => {
    it("Should set reinvestment to false", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoin = await deploySpaceCoin(500000);
      await spaceCoin.startReinvestment().then((tx: any) => tx.wait());
      await spaceCoin.endReinvestment().then((tx: any) => tx.wait());
      await expect(await spaceCoin.reinvestmentTax()).to.be.false;
    });
    it("Should be reverted when reinvestment tax already ended", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoin = await deploySpaceCoin(500000);
      await expect(await spaceCoin.reinvestmentTax()).to.be.false;
      const promise = spaceCoin.endReinvestment().then((tx: any) => tx.wait());
      await expect(promise).to.be.reverted;
    });
    it("Should be reverted when called by non-owner", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoin = await deploySpaceCoin(500000);
      const promise = spaceCoin
        .connect(addresses[1])
        .endReinvestment()
        .then((tx: any) => tx.wait());
      await expect(promise).to.be.reverted;
    });
  });
});
