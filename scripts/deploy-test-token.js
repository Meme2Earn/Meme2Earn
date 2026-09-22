import hre from "hardhat";

const RECIPIENT = "0x2EC32DebF00222943Fd9DAF93A625D9A5ccAB319";
const INITIAL_SUPPLY = 1_000_000_000n;
const RECIPIENT_AMOUNT = 1_000_000n;

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("Recipient:", RECIPIENT);

  const initialSupply = ethers.parseUnits(INITIAL_SUPPLY.toString(), 18);
  const recipientAmount = ethers.parseUnits(RECIPIENT_AMOUNT.toString(), 18);

  const TestToken = await ethers.getContractFactory("Meme2EarnTestToken");
  const token = await TestToken.deploy(deployer.address, initialSupply);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("Meme2EarnTestToken:", tokenAddress);

  const transferTx = await token.transfer(RECIPIENT, recipientAmount);
  await transferTx.wait();

  console.log("Transferred:", ethers.formatUnits(recipientAmount, 18), "M2ET");
  console.log("Transfer tx:", transferTx.hash);
  console.log("Explorer:", `https://explorer.testnet.chain.robinhood.com/address/${tokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
