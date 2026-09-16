import { ethers } from "ethers";

export const ROBINHOOD_TESTNET = {
  chainId: 46630,
  chainIdHex: "0xb626",
  name: "Robinhood Testnet",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: ["https://rpc.testnet.chain.robinhood.com"],
  blockExplorerUrls: ["https://explorer.testnet.chain.robinhood.com"],
};

export const DARE_ESCROW_ADDRESS = import.meta.env.VITE_DARE_ESCROW_ADDRESS || "";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const ESCROW_ABI = [
  "function createEscrow(bytes32 bountyId,address token,uint256 targetAmount,uint64 deadline,uint8 fundingType,uint8 winnerSelection,uint256 initialAmount) external",
  "function fund(bytes32 bountyId,uint256 amount) external",
  "function finalize(bytes32 bountyId,address winner) external",
];

function requireEscrowAddress() {
  if (!DARE_ESCROW_ADDRESS) {
    throw new Error("Escrow contract address is not configured.");
  }
}

export function toEscrowBountyId(bountyId) {
  return ethers.id(String(bountyId));
}

export function toEscrowDeadline(deadline) {
  const fallback = Date.now() + 7 * 86400000;
  const date = deadline ? new Date(`${deadline}T23:59:59`) : new Date(fallback);
  const timestamp = Math.floor(date.getTime() / 1000);
  if (!Number.isFinite(timestamp) || timestamp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Deadline must be in the future before escrow can be created.");
  }
  return timestamp;
}

async function getWalletProvider(wallet) {
  if (!wallet?.getEthereumProvider) {
    throw new Error("Embedded wallet provider is not ready yet.");
  }
  return wallet.getEthereumProvider();
}

async function ensureRobinhoodTestnet(externalProvider) {
  try {
    await externalProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ROBINHOOD_TESTNET.chainIdHex }],
    });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    await externalProvider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: ROBINHOOD_TESTNET.chainIdHex,
          chainName: ROBINHOOD_TESTNET.name,
          nativeCurrency: ROBINHOOD_TESTNET.nativeCurrency,
          rpcUrls: ROBINHOOD_TESTNET.rpcUrls,
          blockExplorerUrls: ROBINHOOD_TESTNET.blockExplorerUrls,
        },
      ],
    });
  }
}

export async function getEscrowSigner(wallet) {
  requireEscrowAddress();
  const externalProvider = await getWalletProvider(wallet);
  await ensureRobinhoodTestnet(externalProvider);
  const provider = new ethers.BrowserProvider(externalProvider);
  return provider.getSigner();
}

async function getTokenAmount(tokenAddress, signer, displayAmount) {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  let decimals = 18;
  try {
    decimals = Number(await token.decimals());
  } catch {
    decimals = 18;
  }
  return {
    amount: ethers.parseUnits(String(displayAmount), decimals),
    token,
  };
}

async function approveIfNeeded({ amount, owner, token }) {
  const allowance = await token.allowance(owner, DARE_ESCROW_ADDRESS);
  if (allowance >= amount) return null;
  const tx = await token.approve(DARE_ESCROW_ADDRESS, amount);
  await tx.wait();
  return tx.hash;
}

export async function createBountyEscrow({ bounty, wallet }) {
  requireEscrowAddress();
  if (!bounty?.tokenAddress) throw new Error("Token address is missing.");

  const signer = await getEscrowSigner(wallet);
  const signerAddress = await signer.getAddress();
  const { amount, token } = await getTokenAmount(bounty.tokenAddress, signer, bounty.reward);
  const isSelfFunded = bounty.fundingType !== "Community-Funded Dare";
  const fundingType = isSelfFunded ? 0 : 1;
  const winnerSelection = bounty.winnerSelection === "Creator decides" ? 0 : 1;
  const escrowBountyId = toEscrowBountyId(bounty.id);
  const deadline = toEscrowDeadline(bounty.deadline);

  let approveTxHash = "";
  if (isSelfFunded) {
    approveTxHash = (await approveIfNeeded({ amount, owner: signerAddress, token })) || "";
  }

  const escrow = new ethers.Contract(DARE_ESCROW_ADDRESS, ESCROW_ABI, signer);
  const tx = await escrow.createEscrow(
    escrowBountyId,
    bounty.tokenAddress,
    amount,
    deadline,
    fundingType,
    winnerSelection,
    isSelfFunded ? amount : 0n,
  );
  const receipt = await tx.wait();

  return {
    approveTxHash,
    escrowAddress: DARE_ESCROW_ADDRESS,
    escrowBountyId,
    escrowStatus: isSelfFunded ? "Funded" : "Open",
    escrowTxHash: receipt?.hash || tx.hash,
  };
}

export async function fundBountyEscrow({ amount: displayAmount, bounty, wallet }) {
  requireEscrowAddress();
  if (!bounty?.tokenAddress) throw new Error("Token address is missing.");
  if (!bounty?.escrowBountyId) throw new Error("Escrow id is missing.");

  const signer = await getEscrowSigner(wallet);
  const signerAddress = await signer.getAddress();
  const { amount, token } = await getTokenAmount(bounty.tokenAddress, signer, displayAmount);
  await approveIfNeeded({ amount, owner: signerAddress, token });

  const escrow = new ethers.Contract(bounty.escrowAddress || DARE_ESCROW_ADDRESS, ESCROW_ABI, signer);
  const tx = await escrow.fund(bounty.escrowBountyId, amount);
  const receipt = await tx.wait();
  return { escrowFundTxHash: receipt?.hash || tx.hash };
}

export async function finalizeBountyEscrow({ bounty, wallet, winner }) {
  requireEscrowAddress();
  if (!bounty?.escrowBountyId) throw new Error("Escrow id is missing.");
  if (!winner) throw new Error("Winner wallet is missing.");

  const signer = await getEscrowSigner(wallet);
  const escrow = new ethers.Contract(bounty.escrowAddress || DARE_ESCROW_ADDRESS, ESCROW_ABI, signer);
  const tx = await escrow.finalize(bounty.escrowBountyId, winner);
  const receipt = await tx.wait();
  return { escrowFinalizeTxHash: receipt?.hash || tx.hash };
}
