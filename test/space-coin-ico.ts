import { expect } from "chai";
import { ethers } from "hardhat";

const deploySpaceCoinIco = async () => {
  const SpaceCoinFactory = await ethers.getContractFactory("SpaceCoin");
  const spaceCoin = await SpaceCoinFactory.deploy(ethers.utils.parseEther("5").mul(100000));
  await spaceCoin.deployed();
  const SpaceCoinIco = await ethers.getContractFactory("SpaceCoinIco");
  const spaceCoinIco = await SpaceCoinIco.deploy(spaceCoin.address);
  await spaceCoin
    .increaseAllowance(spaceCoinIco.address, ethers.utils.parseEther("30").mul(1000))
    .then((tx: any) => tx.wait());
  await spaceCoinIco.deployed();
  return spaceCoinIco;
};

describe("SpaceCoinIco Contract", () => {
  it("ERC20 address should be set to deployment address", async () => {
    const [owner, ...addresses] = await ethers.getSigners();
    const SpaceCoin = await ethers.getContractFactory("SpaceCoin");
    const spaceCoin = await SpaceCoin.deploy(ethers.utils.parseEther("5").mul(100000));
    await spaceCoin.deployed();
    const SpaceCoinIco = await ethers.getContractFactory("SpaceCoinIco");
    const spaceCoinIco = await SpaceCoinIco.deploy(spaceCoin.address);
    await spaceCoin
      .increaseAllowance(spaceCoinIco.address, ethers.utils.parseEther("30").mul(1000))
      .then((tx: any) => tx.wait());

    await spaceCoinIco.deployed();
    expect(await spaceCoinIco.spaceCoinAddress()).to.equal(spaceCoin.address);
  });
  describe("updateWhitelist function", () => {
    it("Should update whitelist when a new address is added with value true", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoinIco = await deploySpaceCoinIco();
      await spaceCoinIco
        .updateWhitelist([addresses[1].address, addresses[2].address], true)
        .then((tx: any) => tx.wait());
      await expect(await spaceCoinIco.whitelist(addresses[1].address)).to.be.true;
    });
    it("Should update whitelist when a new address is added with value false", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoinIco = await deploySpaceCoinIco();
      await spaceCoinIco
        .updateWhitelist([addresses[1].address, addresses[2].address], true)
        .then((tx: any) => tx.wait());
      await expect(await spaceCoinIco.whitelist(addresses[1].address)).to.be.true;

      await spaceCoinIco
        .updateWhitelist([addresses[1].address, addresses[2].address], false)
        .then((tx: any) => tx.wait());
      await expect(await spaceCoinIco.whitelist(addresses[1].address)).to.be.false;
    });
  });
  describe("movePhaseForward function", () => {
    it("Should increment forward phases", async () => {
      const spaceCoinIco = await deploySpaceCoinIco();
      expect(await spaceCoinIco.currentPhase()).to.equal(0);
      await spaceCoinIco.movePhaseForward().then((tx: any) => tx.wait());
      expect(await spaceCoinIco.currentPhase()).to.equal(1);
      await spaceCoinIco.movePhaseForward().then((tx: any) => tx.wait());
      expect(await spaceCoinIco.currentPhase()).to.equal(2);
    });
    it("Should revert if already in Open phase", async () => {
      const spaceCoinIco = await deploySpaceCoinIco();
      expect(await spaceCoinIco.currentPhase()).to.equal(0);
      await spaceCoinIco.movePhaseForward().then((tx: any) => tx.wait());
      expect(await spaceCoinIco.currentPhase()).to.equal(1);
      await spaceCoinIco.movePhaseForward().then((tx: any) => tx.wait());
      expect(await spaceCoinIco.currentPhase()).to.equal(2);
      const promise = spaceCoinIco.movePhaseForward().then((tx: any) => tx.wait());
      await expect(promise).to.be.reverted;
    });
    it("Should revert if called by non-owner", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoinIco = await deploySpaceCoinIco();
      const promise = spaceCoinIco
        .connect(addresses[1].address)
        .movePhaseForward()
        .then((tx: any) => tx.wait());
      await expect(promise).to.be.reverted;
    });
  });
  describe("purchaseSpaceCoin function", () => {
    it("Allow a purchase of spaceCoin", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoinIco = await deploySpaceCoinIco();
      await spaceCoinIco
        .updateWhitelist(
          addresses.map(({ address }) => address),
          true,
        )
        .then((tx: any) => tx.wait());

      await spaceCoinIco
        .connect(addresses[1])
        .purchaseSpaceCoin({
          value: ethers.BigNumber.from((3e18).toString()),
        })
        .then((tx: any) => tx.wait());
      await expect(await spaceCoinIco.amountContributedByAddress(addresses[1].address)).to.equal(
        ethers.BigNumber.from((3e18).toString()),
      );
      await expect(await spaceCoinIco.totalContributions()).to.equal(ethers.BigNumber.from((3e18).toString()));
    });
    it("Not allow purchase of spaceCoin if not on the whitelist", async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const spaceCoinIco = await deploySpaceCoinIco();
      await spaceCoinIco
        .updateWhitelist(
          addresses.map(({ address }) => address),
          false,
        )
        .then((tx: any) => tx.wait());

      const promise = spaceCoinIco
        .connect(addresses[1])
        .purchaseSpaceCoin({
          value: ethers.BigNumber.from((3e18).toString()),
        })
        .then((tx: any) => tx.wait());
      await expect(promise).to.be.reverted;
    });
  });
  describe("distributing SpaceCoin", () => {
    const deployContracts = async () => {
      const [owner, ...addresses] = await ethers.getSigners();
      const SpaceCoin = await ethers.getContractFactory("SpaceCoin");
      const spaceCoin = await SpaceCoin.connect(owner).deploy(
        ethers.BigNumber.from((5).toString()).mul(ethers.BigNumber.from(10).pow(23)),
      );
      await spaceCoin.deployed();
      // await spaceCoin.unpause().then((tx: any) => tx.wait());
      const SpaceCoinIco = await ethers.getContractFactory("SpaceCoinIco");
      const spaceCoinIco = await SpaceCoinIco.connect(owner).deploy(spaceCoin.address);
      await spaceCoin
        .increaseAllowance(spaceCoinIco.address, ethers.utils.parseEther("30").mul(1000))
        .then((tx: any) => tx.wait());
      await spaceCoinIco.deployed();
      await spaceCoinIco
        .updateWhitelist(
          addresses.map(({ address }) => address),
          true,
        )
        .then((tx: any) => tx.wait());
      return { spaceCoinIco, spaceCoin, addresses, owner };
    };
    it("distributes spaceCoin on Open phase", async () => {
      const { spaceCoinIco, spaceCoin, addresses, owner } = await deployContracts();
      const totalSupply = await spaceCoin.totalSupply();
      const balanceOwner = await spaceCoin.balanceOf(owner.address);
      const allowance = await spaceCoin.allowance(owner.address, spaceCoinIco.address);

      const contributionAmount = ethers.BigNumber.from((3e18).toString());
      const promise = spaceCoinIco
        .connect(addresses[1])
        .purchaseSpaceCoin({
          value: contributionAmount,
        })
        .then((tx: any) => tx.wait());
      await spaceCoinIco.movePhaseForward().then((tx: any) => tx.wait());
      await spaceCoinIco.movePhaseForward().then((tx: any) => tx.wait());
      const balance = await spaceCoin.balanceOf(addresses[1].address);
      expect(balance).to.equal(contributionAmount.mul(5).toString());
    });
    it("Distributes spaceCoin on Open Phase when tax is on", async () => {
      const { spaceCoinIco, spaceCoin, addresses } = await deployContracts();

      const contributionAmount = ethers.BigNumber.from((3e18).toString());
      const promise = spaceCoinIco
        .connect(addresses[1])
        .purchaseSpaceCoin({
          value: contributionAmount,
        })
        .then((tx: any) => tx.wait());
      await spaceCoin.startReinvestment().then((tx: any) => tx.wait());
      await spaceCoinIco.movePhaseForward().then((tx: any) => tx.wait());
      await spaceCoinIco.movePhaseForward().then((tx: any) => tx.wait());
      const balance = await spaceCoin.balanceOf(addresses[1].address);
      expect(balance).to.equal(contributionAmount.mul(5).mul(98).div(100).toString());
    });
  });
});
