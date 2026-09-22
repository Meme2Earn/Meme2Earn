import { expect } from "chai";
import hre from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const { ethers } = hre;
const DAY = 24 * 60 * 60;

describe("DareEscrow", function () {
  async function deployFixture() {
    const [admin, creator, contributor, winner, outsider, secondCreator] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("Meme2EarnTestToken");
    const token = await Token.deploy(admin.address, ethers.parseEther("10000000"));
    const Escrow = await ethers.getContractFactory("DareEscrow");
    const escrow = await Escrow.deploy(admin.address, admin.address);
    await escrow.setSupportedToken(await token.getAddress(), true);
    for (const account of [creator, contributor, secondCreator]) {
      await token.transfer(account.address, ethers.parseEther("2000000"));
      await token.connect(account).approve(await escrow.getAddress(), ethers.MaxUint256);
    }
    return { admin, contributor, creator, escrow, outsider, secondCreator, token, winner };
  }

  async function createEscrow({
    amount = ethers.parseEther("1000"),
    creator,
    escrow,
    fundingType = 1,
    token,
    winnerSelection = 0,
  }) {
    const clientId = ethers.id(`bounty-${creator.address}`);
    const deadline = (await time.latest()) + DAY;
    const initialAmount = fundingType === 0 ? amount : 0;
    await escrow.connect(creator).createEscrow(
      clientId,
      await token.getAddress(),
      amount,
      deadline,
      fundingType,
      winnerSelection,
      initialAmount,
    );
    return { amount, clientId, deadline, id: await escrow.escrowId(creator.address, clientId) };
  }

  it("namespaces identical client IDs by creator", async function () {
    const { creator, escrow, secondCreator, token } = await loadFixture(deployFixture);
    const clientId = ethers.id("shared-client-id");
    const deadline = (await time.latest()) + DAY;
    for (const account of [creator, secondCreator]) {
      await escrow.connect(account).createEscrow(clientId, await token.getAddress(), 100, deadline, 1, 0, 0);
    }
    const firstId = await escrow.escrowId(creator.address, clientId);
    const secondId = await escrow.escrowId(secondCreator.address, clientId);
    expect(firstId).not.to.equal(secondId);
    expect((await escrow.escrows(firstId)).creator).to.equal(creator.address);
    expect((await escrow.escrows(secondId)).creator).to.equal(secondCreator.address);
  });

  it("rejects community funding at or after the deadline", async function () {
    const { contributor, creator, escrow, token } = await loadFixture(deployFixture);
    const campaign = await createEscrow({ creator, escrow, token });
    await time.increaseTo(campaign.deadline);
    await expect(escrow.connect(contributor).fund(campaign.id, 100)).to.be.revertedWithCustomError(escrow, "DeadlineReached");
  });

  it("allows anyone to cancel an expired partially funded escrow and contributors to refund", async function () {
    const { contributor, creator, escrow, outsider, token } = await loadFixture(deployFixture);
    const campaign = await createEscrow({ creator, escrow, token });
    const contribution = ethers.parseEther("400");
    await escrow.connect(contributor).fund(campaign.id, contribution);
    await time.increaseTo(campaign.deadline + 7 * DAY);
    await escrow.connect(outsider).cancelExpiredUnfinalized(campaign.id);
    await expect(() => escrow.connect(contributor).refund(campaign.id)).to.changeTokenBalance(token, contributor, contribution);
  });

  it("allows anyone to cancel a funded escrow after the refund delay", async function () {
    const { contributor, creator, escrow, outsider, token } = await loadFixture(deployFixture);
    const campaign = await createEscrow({ creator, escrow, token });
    await escrow.connect(contributor).fund(campaign.id, campaign.amount);
    await time.increaseTo(campaign.deadline + 7 * DAY);
    await escrow.connect(outsider).cancelExpiredUnfinalized(campaign.id);
    await expect(() => escrow.connect(contributor).refund(campaign.id)).to.changeTokenBalance(token, contributor, campaign.amount);
  });

  it("rejects fee-on-transfer tokens instead of creating insolvent accounting", async function () {
    const { admin, creator, escrow } = await loadFixture(deployFixture);
    const FeeToken = await ethers.getContractFactory("MockFeeOnTransferToken");
    const feeToken = await FeeToken.deploy();
    await feeToken.transfer(creator.address, ethers.parseEther("2000"));
    await feeToken.connect(creator).approve(await escrow.getAddress(), ethers.MaxUint256);
    await escrow.connect(admin).setSupportedToken(await feeToken.getAddress(), true);
    const clientId = ethers.id("fee-token-bounty");
    const deadline = (await time.latest()) + DAY;
    await escrow.connect(creator).createEscrow(clientId, await feeToken.getAddress(), ethers.parseEther("1000"), deadline, 1, 0, 0);
    const id = await escrow.escrowId(creator.address, clientId);
    await expect(escrow.connect(creator).fund(id, ethers.parseEther("1000"))).to.be.revertedWithCustomError(
      escrow,
      "UnsupportedTokenBehavior",
    );
  });

  it("allows the creator to finalize CreatorDecides before the deadline", async function () {
    const { creator, escrow, token, winner } = await loadFixture(deployFixture);
    const campaign = await createEscrow({ creator, escrow, fundingType: 0, token, winnerSelection: 0 });
    await expect(() => escrow.connect(creator).finalize(campaign.id, winner.address)).to.changeTokenBalance(
      token,
      winner,
      campaign.amount,
    );
  });

  it("supports a self-funded bounty when the creator is also the fee recipient", async function () {
    const { admin, escrow, token } = await loadFixture(deployFixture);
    await token.approve(await escrow.getAddress(), ethers.MaxUint256);
    const amount = ethers.parseEther("1000");
    const clientId = ethers.id("admin-bounty");
    const deadline = (await time.latest()) + DAY;
    await expect(escrow.connect(admin).createEscrow(clientId, await token.getAddress(), amount, deadline, 0, 0, amount))
      .not.to.be.reverted;
  });

  it("still prevents early community finalization", async function () {
    const { admin, creator, escrow, token, winner } = await loadFixture(deployFixture);
    const campaign = await createEscrow({ creator, escrow, fundingType: 0, token, winnerSelection: 1 });
    await expect(escrow.connect(admin).finalize(campaign.id, winner.address)).to.be.revertedWithCustomError(
      escrow,
      "DeadlineNotReached",
    );
  });

  it("allows a creator to cancel and recover a funded bounty before its deadline", async function () {
    const { creator, escrow, token } = await loadFixture(deployFixture);
    const campaign = await createEscrow({ creator, escrow, fundingType: 0, token });
    await escrow.connect(creator).cancel(campaign.id);
    await expect(() => escrow.connect(creator).refund(campaign.id)).to.changeTokenBalance(token, creator, campaign.amount);
  });
});
