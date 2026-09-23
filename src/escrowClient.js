import { ethers } from "ethers";

export const ROBINHOOD_TESTNET = {
  chainId: 4663,
  chainIdHex: "0x1237",
  name: "Robinhood Chain",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
  blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
};

export const DARE_ESCROW_ADDRESS = import.meta.env.VITE_DARE_ESCROW_ADDRESS || "";
export const CREATOR_FEE_BPS = 250;
export const CREATOR_FEE_RATE = CREATOR_FEE_BPS / 10000;

export function getTransactionExplorerUrl(transactionHash) {
  return transactionHash ? `${ROBINHOOD_TESTNET.blockExplorerUrls[0]}/tx/${transactionHash}` : "";
}

export async function getTransactionStatus(transactionHash) {
  if (!ethers.isHexString(transactionHash, 32)) {
    return { status: "Unavailable", blockNumber: null, timestamp: null };
  }

  try {
    const provider = new ethers.JsonRpcProvider(ROBINHOOD_TESTNET.rpcUrls[0], ROBINHOOD_TESTNET.chainId);
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt) return { status: "Pending", blockNumber: null, timestamp: null };

    const block = await provider.getBlock(receipt.blockNumber);
    return {
      status: receipt.status === 1 ? "Confirmed" : "Failed",
      blockNumber: receipt.blockNumber,
      timestamp: block ? Number(block.timestamp) * 1000 : null,
    };
  } catch {
    return { status: "Unavailable", blockNumber: null, timestamp: null };
  }
}

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address recipient, uint256 amount) external returns (bool)",
];

const ESCROW_ABI = [
  "function createEscrow(bytes32 bountyId,address token,uint256 targetAmount,uint64 deadline,uint8 fundingType,uint8 winnerSelection,uint256 initialAmount) external",
  "function escrows(bytes32 bountyId) view returns (address creator,address token,uint256 targetAmount,uint256 fundedAmount,uint64 deadline,uint64 refundDelay,uint8 fundingType,uint8 winnerSelection,uint8 status,address winner)",
  "function feeRecipient() view returns (address)",
  "function fund(bytes32 bountyId,uint256 amount) external",
  "function finalize(bytes32 bountyId,address winner) external",
  "function paused() view returns (bool)",
  "function supportedTokens(address token) view returns (bool)",
];

function requireEscrowAddress() {
  if (!DARE_ESCROW_ADDRESS) {
    throw new Error("Escrow contract address is not configured.");
  }
}

export function toEscrowBountyId(bountyId, creator) {
  if (!ethers.isAddress(creator)) throw new Error("Creator wallet is missing.");
  return ethers.solidityPackedKeccak256(["address", "bytes32"], [creator, ethers.id(String(bountyId))]);
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

async function getWalletSigner(wallet) {
  const externalProvider = await getWalletProvider(wallet);
  await ensureRobinhoodTestnet(externalProvider);
  const provider = new ethers.BrowserProvider(externalProvider);
  return provider.getSigner();
}

export async function getEscrowSigner(wallet) {
  requireEscrowAddress();
  return getWalletSigner(wallet);
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

async function getTokenDecimals(token) {
  try {
    return Number(await token.decimals());
  } catch {
    return 18;
  }
}

export async function getTokenBalance({ tokenAddress, walletAddress }) {
  if (!tokenAddress) throw new Error("Token address is missing.");
  if (!walletAddress) throw new Error("Wallet address is missing.");

  const provider = new ethers.JsonRpcProvider(ROBINHOOD_TESTNET.rpcUrls[0], ROBINHOOD_TESTNET.chainId);
  const code = await provider.getCode(tokenAddress);
  if (code === "0x") {
    throw new Error("Token contract is not deployed on Robinhood testnet.");
  }

  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const [rawBalance, decimals] = await Promise.all([
    token.balanceOf(walletAddress),
    getTokenDecimals(token),
  ]);

  return {
    decimals,
    formatted: ethers.formatUnits(rawBalance, decimals),
    rawBalance,
  };
}

export async function transferToken({ amount: displayAmount, recipient, tokenAddress, wallet }) {
  if (!tokenAddress) throw new Error("This token is not configured.");
  if (!ethers.isAddress(recipient)) throw new Error("Enter a valid EVM wallet address.");

  const signer = await getWalletSigner(wallet);
  const sender = await signer.getAddress();
  const provider = signer.provider;
  const code = await provider.getCode(tokenAddress);
  if (code === "0x") {
    throw new Error("This token is not available on Robinhood Chain.");
  }

  const { amount, token } = await getTokenAmount(tokenAddress, signer, displayAmount);
  if (amount <= 0n) throw new Error("Enter an amount greater than 0.");

  const balance = await token.balanceOf(sender);
  if (balance < amount) throw new Error("Insufficient token balance.");

  const transaction = await token.transfer(recipient, amount);
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) throw new Error("The token transfer failed.");

  return {
    transactionHash: receipt.hash || transaction.hash,
    explorerUrl: `${ROBINHOOD_TESTNET.blockExplorerUrls[0]}/tx/${receipt.hash || transaction.hash}`,
  };
}

async function approveIfNeeded({ amount, owner, token }) {
  const allowance = await token.allowance(owner, DARE_ESCROW_ADDRESS);
  if (allowance >= amount) return null;
  const tx = await token.approve(DARE_ESCROW_ADDRESS, amount);
  await tx.wait();
  return tx.hash;
}

export function calculateCreatorFee(displayAmount) {
  const amount = Number(displayAmount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return amount * CREATOR_FEE_RATE;
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
  const clientBountyId = ethers.id(String(bounty.id));
  const escrowBountyId = toEscrowBountyId(bounty.id, signerAddress);
  const deadline = toEscrowDeadline(bounty.deadline);
  const escrow = new ethers.Contract(DARE_ESCROW_ADDRESS, ESCROW_ABI, signer);

  const [escrowCode, tokenCode] = await Promise.all([
    signer.provider.getCode(DARE_ESCROW_ADDRESS),
    signer.provider.getCode(bounty.tokenAddress),
  ]);

  if (escrowCode === "0x") throw new Error("The escrow contract is not available on Robinhood Chain.");
  if (tokenCode === "0x") throw new Error(`${bounty.coin || "This token"} is not available on Robinhood Chain.`);

  const [escrowPaused, tokenSupported] = await Promise.all([
    escrow.paused(),
    escrow.supportedTokens(bounty.tokenAddress),
  ]);
  if (escrowPaused) throw new Error("Bounty launches are temporarily paused.");
  if (!tokenSupported) throw new Error(`${bounty.coin || "This token"} is not supported by the escrow contract.`);

  let approveTxHash = "";
  if (isSelfFunded) {
    const creatorFee = (amount * BigInt(CREATOR_FEE_BPS)) / 10000n;
    const feeRecipient = await escrow.feeRecipient();
    const requiredAmount = signerAddress.toLowerCase() === feeRecipient.toLowerCase() ? amount : amount + creatorFee;
    const balance = await token.balanceOf(signerAddress);
    if (balance < requiredAmount) {
      const decimals = await getTokenDecimals(token);
      const required = ethers.formatUnits(requiredAmount, decimals);
      const available = ethers.formatUnits(balance, decimals);
      throw new Error(
        `Insufficient ${bounty.coin || "token"} balance. Launching this bounty requires ${required} including the 2.5% fee; your wallet has ${available}.`,
      );
    }
    approveTxHash = (await approveIfNeeded({ amount: requiredAmount, owner: signerAddress, token })) || "";
  }

  let tx;
  let receipt;
  try {
    tx = await escrow.createEscrow(
      clientBountyId,
      bounty.tokenAddress,
      amount,
      deadline,
      fundingType,
      winnerSelection,
      isSelfFunded ? amount : 0n,
    );
    receipt = await tx.wait();
  } catch (error) {
    if (error?.code === 4001 || error?.code === "ACTION_REJECTED") {
      throw new Error("Escrow transaction cancelled.");
    }
    throw new Error("The escrow contract rejected this bounty. Check the token balance, deadline, and network, then try again.");
  }

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
  if (!ethers.isAddress(winner) || winner === ethers.ZeroAddress) {
    throw new Error("The selected submission does not have a valid winner wallet.");
  }

  const signer = await getEscrowSigner(wallet);
  const signerAddress = await signer.getAddress();
  const escrowAddress = bounty.escrowAddress || DARE_ESCROW_ADDRESS;
  const escrowCode = await signer.provider.getCode(escrowAddress);
  if (escrowCode === "0x") throw new Error("The escrow contract is not available on Robinhood Chain.");

  const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
  const [state, latestBlock] = await Promise.all([
    escrow.escrows(bounty.escrowBountyId),
    signer.provider.getBlock("latest"),
  ]);
  const status = Number(state.status);
  const deadline = Number(state.deadline);

  if (status === 0) throw new Error("No on-chain escrow exists for this bounty.");
  if (status === 1) throw new Error("This bounty is not fully funded yet. A winner can be selected after the escrow is fully funded.");
  if (status === 3) throw new Error("A winner has already been selected for this bounty.");
  if (status === 4) throw new Error("This bounty escrow has been cancelled.");
  if (status !== 2) throw new Error("This bounty escrow is not ready for winner selection.");
  if (Number(state.winnerSelection) === 1 && (latestBlock?.timestamp || 0) < deadline) {
    throw new Error(`Winner selection opens after the campaign deadline: ${new Date(deadline * 1000).toLocaleString()}.`);
  }
  if (Number(state.winnerSelection) === 0 && state.creator.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error("Only the on-chain bounty creator can select this winner.");
  }

  let tx;
  let receipt;
  try {
    tx = await escrow.finalize(bounty.escrowBountyId, winner);
    receipt = await tx.wait();
  } catch (error) {
    if (error?.code === 4001 || error?.code === "ACTION_REJECTED") {
      throw new Error("Winner selection transaction cancelled.");
    }
    throw new Error("The escrow contract could not release this reward. Refresh the campaign and try again.");
  }
  return { escrowFinalizeTxHash: receipt?.hash || tx.hash };
}
