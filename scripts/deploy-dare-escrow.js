import hre from "hardhat";

const SUPPORTED_TOKENS = [
  ["USDG", "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"],
  ["PONS", "0x39dBED3a2bd333467115dE45665cC57F813C4571"],
  ["CASHCAT", "0x020bfC650A365f8BB26819deAAbF3E21291018b4"],
  ["ARTIFICIAL_INU", "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18"],
  ["NVDA", "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC"],
  ["AAPL", "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9"],
  ["MSFT", "0xe93237C50D904957Cf27E7B1133b510C669c2e74"],
];

const testTokenAddress = process.env.TEST_TOKEN_ADDRESS || process.env.VITE_TEST_TOKEN_ADDRESS || "";
if (testTokenAddress) {
  SUPPORTED_TOKENS.push(["M2ET", testTokenAddress]);
}

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  const admin = process.env.ESCROW_ADMIN || deployer.address;
  const feeRecipient = process.env.CREATOR_FEE_RECIPIENT || admin;
  const finalizer = process.env.ESCROW_FINALIZER || "";

  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("Admin:", admin);
  console.log("Fee recipient:", feeRecipient);

  const DareEscrow = await ethers.getContractFactory("DareEscrow");
  const escrow = await DareEscrow.deploy(admin, feeRecipient);
  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();
  console.log("DareEscrow:", escrowAddress);

  const finalizerRole = await escrow.FINALIZER_ROLE();

  if (finalizer) {
    const tx = await escrow.grantRole(finalizerRole, finalizer);
    await tx.wait();
    console.log("Granted FINALIZER_ROLE:", finalizer);
  }

  for (const [symbol, address] of SUPPORTED_TOKENS) {
    const tx = await escrow.setSupportedToken(address, true);
    await tx.wait();
    console.log("Supported token:", symbol, address);
  }

  console.log("Explorer:", `https://explorer.testnet.chain.robinhood.com/address/${escrowAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
