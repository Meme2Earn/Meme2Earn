import { importSPKI, jwtVerify } from "npm:jose@5.9.6";
import { Contract, JsonRpcProvider, Wallet } from "npm:ethers@6.17.0";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const privyAppId = Deno.env.get("PRIVY_APP_ID") || "";
const privyVerificationKey = Deno.env.get("PRIVY_JWT_VERIFICATION_KEY") || "";
const robinhoodRpcUrl = Deno.env.get("RH_RPC_URL") || "https://rpc.testnet.chain.robinhood.com";
const dareEscrowAddress = Deno.env.get("DARE_ESCROW_ADDRESS") || Deno.env.get("VITE_DARE_ESCROW_ADDRESS") || "";
const escrowFinalizerPrivateKey =
  Deno.env.get("DARE_ESCROW_FINALIZER_PRIVATE_KEY") || Deno.env.get("ESCROW_FINALIZER_PRIVATE_KEY") || "";
const communityFinalizerCronSecret = Deno.env.get("COMMUNITY_FINALIZER_CRON_SECRET") || "";
const minimumDareRewards: Record<string, number> = {
  USDG: 100,
  PONS: 167,
  CASHCAT: 619,
  ARTIFICIAL_INU: 406,
  MSFT: 0.2,
  AAPL: 0.3,
  NVDA: 0.45,
};

const escrowAbi = ["function finalize(bytes32 bountyId,address winner) external"];

type BountyInput = {
  category: string;
  coin: string;
  deadline?: string;
  description: string;
  fundingType: string;
  id: string;
  image?: string;
  maxApplicants: number;
  poster: string;
  reward: number;
  status: string;
  title: string;
  tokenAddress: string;
  winnerSelection: string;
  escrowAddress?: string;
  escrowBountyId?: string;
  escrowTxHash?: string;
  escrowStatus?: string;
  escrowFinalizeTxHash?: string;
};

function toPemPublicKey(value: string) {
  if (value.includes("BEGIN PUBLIC KEY")) return value.replace(/\\n/g, "\n");
  return `-----BEGIN PUBLIC KEY-----\n${value}\n-----END PUBLIC KEY-----`;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function verifyCommunityFinalizerCron(request: Request) {
  const providedSecret = request.headers.get("x-community-finalizer-cron-secret") || "";
  if (!communityFinalizerCronSecret || providedSecret !== communityFinalizerCronSecret) {
    throw new Error("Unauthorized automated finalization request.");
  }
}

async function verifyPrivyToken(request: Request) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Missing Privy access token.");
  if (!privyAppId || !privyVerificationKey) throw new Error("Privy verification is not configured.");

  const key = await importSPKI(toPemPublicKey(privyVerificationKey), "ES256");
  const { payload } = await jwtVerify(token, key, {
    audience: privyAppId,
    issuer: "privy.io",
  });

  if (!payload.sub) throw new Error("Privy token is missing a user id.");
  return String(payload.sub);
}

function bountyToRow(bounty: BountyInput) {
  return {
    id: String(bounty.id),
    title: String(bounty.title || "").trim(),
    description: String(bounty.description || ""),
    category: String(bounty.category || ""),
    reward: Number(bounty.reward),
    coin: String(bounty.coin || ""),
    deadline: bounty.deadline || null,
    applicants: 0,
    max_applicants: Number(bounty.maxApplicants) || 1,
    status: bounty.status || "Open",
    poster: String(bounty.poster || ""),
    image_url: bounty.image || null,
    funding_type: bounty.fundingType || "Self-Funded Dare",
    winner_selection: bounty.winnerSelection || "Community decides",
    token_address: bounty.tokenAddress || "",
    escrow_address: bounty.escrowAddress || "",
    escrow_bounty_id: bounty.escrowBountyId || "",
    escrow_tx_hash: bounty.escrowTxHash || "",
    escrow_status: bounty.escrowStatus || "",
    escrow_finalize_tx_hash: bounty.escrowFinalizeTxHash || "",
  };
}

function normalizeBounty(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    category: row.category,
    reward: Number(row.reward) || 0,
    coin: row.coin,
    deadline: row.deadline || "",
    daysLeft: row.deadline ? Math.max(0, Math.ceil((new Date(String(row.deadline)).getTime() - Date.now()) / 86400000)) : 0,
    applicants: Number(row.applicants) || 0,
    maxApplicants: Number(row.max_applicants) || 1,
    status: row.status,
    poster: row.poster,
    image: row.image_url || "",
    fundingType: row.funding_type,
    winnerSelection: row.winner_selection || "Community decides",
    winnerSubmissionId: row.winner_submission_id || "",
    winnerWalletAddress: row.winner_wallet_address || "",
    winnerSelectedAt: row.winner_selected_at || "",
    tokenAddress: row.token_address || "",
    escrowAddress: row.escrow_address || "",
    escrowBountyId: row.escrow_bounty_id || "",
    escrowTxHash: row.escrow_tx_hash || "",
    escrowStatus: row.escrow_status || "",
    escrowFinalizeTxHash: row.escrow_finalize_tx_hash || "",
    createdAt: row.created_at,
  };
}

function normalizeSubmission(row: Record<string, unknown>) {
  const upvotes = Number(row.upvotes) || 0;
  const downvotes = Number(row.downvotes) || 0;

  return {
    id: row.id,
    bountyId: row.bounty_id,
    walletAddress: row.wallet_address,
    author: row.author || row.wallet_address,
    avatar: row.avatar_url || "",
    text: row.text,
    videoName: row.video_name || "",
    videoPath: row.video_path || "",
    videoType: row.video_type || "",
    videoUrl: row.video_url || "",
    upvotes,
    downvotes,
    score: upvotes - downvotes,
    createdAt: row.created_at ? new Date(String(row.created_at)).toLocaleString() : "",
  };
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "Supabase request failed.");
  }

  return response;
}

function encodeFilter(value: unknown) {
  return encodeURIComponent(String(value || ""));
}

async function createBounty(bounty: BountyInput) {
  const row = bountyToRow(bounty);
  if (!row.title) throw new Error("Title is required.");
  if (!row.poster) throw new Error("Wallet address is required.");
  const minimumReward = minimumDareRewards[row.coin.toUpperCase()] || 1;
  if (!Number.isFinite(row.reward) || row.reward < minimumReward) {
    throw new Error(`Minimum bounty amount is ${minimumReward} ${row.coin}.`);
  }

  const response = await supabaseFetch("/rest/v1/bounties", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([row]),
  });
  const [created] = await response.json();
  return normalizeBounty(created);
}

async function joinBounty(body: Record<string, unknown>) {
  const response = await supabaseFetch("/rest/v1/rpc/join_bounty", {
    method: "POST",
    body: JSON.stringify({
      target_bounty_id: String(body.bountyId || ""),
      user_wallet: String(body.walletAddress || ""),
      user_username: String(body.profile && typeof body.profile === "object" ? (body.profile as Record<string, unknown>).username || "" : ""),
      user_avatar: String(body.profile && typeof body.profile === "object" ? (body.profile as Record<string, unknown>).avatar || "" : ""),
    }),
  });
  const rows = await response.json();
  return rows[0] ? normalizeBounty(rows[0]) : null;
}

async function createSubmission(body: Record<string, unknown>) {
  const submission = (body.submission || {}) as Record<string, unknown>;
  const profile = (body.profile || {}) as Record<string, unknown>;
  const bountyId = String(body.bountyId || "");
  const walletAddress = String(body.walletAddress || "");
  const text = String(submission.text || "").trim();
  const videoUrl = String(submission.videoUrl || "").trim();

  if (!bountyId) throw new Error("Bounty id is required.");
  if (!walletAddress) throw new Error("Wallet address is required.");
  if (!videoUrl) throw new Error("Video upload is required.");

  const joinedResponse = await supabaseFetch(
    `/rest/v1/bounty_joins?select=bounty_id&bounty_id=eq.${encodeFilter(bountyId)}&wallet_address=eq.${encodeFilter(walletAddress)}`
  );
  const joinedRows = await joinedResponse.json();
  if (!joinedRows.length) throw new Error("Join bounty before submitting.");

  const existingResponse = await supabaseFetch(
    `/rest/v1/bounty_submissions?select=id&bounty_id=eq.${encodeFilter(bountyId)}&wallet_address=eq.${encodeFilter(walletAddress)}&limit=1`
  );
  const existingRows = await existingResponse.json();
  if (existingRows.length) throw new Error("You already submitted a video for this campaign.");

  const response = await supabaseFetch("/rest/v1/bounty_submissions", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([
      {
        id: String(submission.id || Date.now()),
        bounty_id: bountyId,
        wallet_address: walletAddress,
        author: String(profile.username || walletAddress),
        avatar_url: String(profile.avatar || ""),
        text,
        video_name: String(submission.videoName || ""),
        video_path: String(submission.videoPath || ""),
        video_type: String(submission.videoType || ""),
        video_url: videoUrl,
      },
    ]),
  });
  const [created] = await response.json();
  return normalizeSubmission(created);
}

async function voteSubmission(body: Record<string, unknown>) {
  const submissionId = String(body.submissionId || "");
  const walletAddress = String(body.walletAddress || "");
  const vote = Number(body.vote) || 0;

  if (!submissionId) throw new Error("Submission id is required.");
  if (!walletAddress) throw new Error("Wallet address is required.");
  if (![1, 0, -1].includes(vote)) throw new Error("Invalid vote.");

  const response = await supabaseFetch("/rest/v1/rpc/vote_submission", {
    method: "POST",
    body: JSON.stringify({
      target_submission_id: submissionId,
      user_wallet: walletAddress,
      user_vote: vote,
    }),
  });
  const rows = await response.json();
  return rows[0] ? normalizeSubmission(rows[0]) : null;
}

async function selectCreatorWinner(body: Record<string, unknown>) {
  const bountyId = String(body.bountyId || "");
  const submissionId = String(body.submissionId || "");
  const walletAddress = String(body.walletAddress || "");
  const escrowFinalizeTxHash = String(body.escrowFinalizeTxHash || "");

  if (!bountyId) throw new Error("Bounty id is required.");
  if (!submissionId) throw new Error("Submission id is required.");
  if (!walletAddress) throw new Error("Wallet address is required.");

  const response = await supabaseFetch("/rest/v1/rpc/select_creator_winner", {
    method: "POST",
    body: JSON.stringify({
      target_bounty_id: bountyId,
      target_submission_id: submissionId,
      creator_wallet: walletAddress,
    }),
  });
  const rows = await response.json();
  if (rows[0] && escrowFinalizeTxHash) {
    const updateResponse = await supabaseFetch(`/rest/v1/bounties?id=eq.${encodeFilter(bountyId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        escrow_finalize_tx_hash: escrowFinalizeTxHash,
        escrow_status: "Finalized",
        updated_at: new Date().toISOString(),
      }),
    });
    const [updated] = await updateResponse.json();
    return updated ? normalizeBounty(updated) : normalizeBounty(rows[0]);
  }
  return rows[0] ? normalizeBounty(rows[0]) : null;
}

function deadlineHasPassed(deadline: unknown) {
  if (!deadline) return false;
  const value = String(deadline);
  const timestamp = Date.parse(value.includes("T") ? value : `${value}T23:59:59Z`);
  return Number.isFinite(timestamp) && Date.now() >= timestamp;
}

function compareSubmissionScore(a: Record<string, unknown>, b: Record<string, unknown>) {
  const aScore = (Number(a.upvotes) || 0) - (Number(a.downvotes) || 0);
  const bScore = (Number(b.upvotes) || 0) - (Number(b.downvotes) || 0);
  if (bScore !== aScore) return bScore - aScore;

  const upvoteDiff = (Number(b.upvotes) || 0) - (Number(a.upvotes) || 0);
  if (upvoteDiff !== 0) return upvoteDiff;

  return Date.parse(String(a.created_at || "")) - Date.parse(String(b.created_at || ""));
}

async function finalizeEscrowFromServer(bounty: Record<string, unknown>, winnerWallet: string) {
  const escrowAddress = String(bounty.escrow_address || dareEscrowAddress || "");
  const escrowBountyId = String(bounty.escrow_bounty_id || "");

  if (!escrowAddress || !escrowBountyId) throw new Error("Escrow metadata is missing for this bounty.");
  if (!escrowFinalizerPrivateKey) throw new Error("Escrow finalizer signer is not configured.");

  const provider = new JsonRpcProvider(robinhoodRpcUrl);
  const signer = new Wallet(escrowFinalizerPrivateKey, provider);
  const escrow = new Contract(escrowAddress, escrowAbi, signer);

  try {
    const tx = await escrow.finalize(escrowBountyId, winnerWallet);
    const receipt = await tx.wait();
    return receipt?.hash || tx.hash;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Escrow finalization failed.";
    if (message.includes("EscrowNotFunded")) throw new Error("Escrow is not fully funded yet.");
    if (message.includes("DeadlineNotReached")) throw new Error("The on-chain deadline has not passed yet.");
    throw new Error(message);
  }
}

async function finalizeCommunityWinner(body: Record<string, unknown>) {
  const bountyId = String(body.bountyId || "");
  if (!bountyId) throw new Error("Bounty id is required.");

  const bountyResponse = await supabaseFetch(`/rest/v1/bounties?select=*&id=eq.${encodeFilter(bountyId)}&limit=1`);
  const [bounty] = await bountyResponse.json();
  if (!bounty) throw new Error("Bounty not found.");

  if (String(bounty.winner_selection || "") !== "Community decides") {
    throw new Error("This bounty does not use community winner selection.");
  }

  if (bounty.winner_submission_id) return normalizeBounty(bounty);
  if (String(bounty.status || "") === "Completed") throw new Error("This bounty is already completed.");
  if (!deadlineHasPassed(bounty.deadline)) throw new Error("Community voting is still open.");

  const submissionsResponse = await supabaseFetch(
    `/rest/v1/bounty_submissions?select=*&bounty_id=eq.${encodeFilter(bountyId)}`
  );
  const submissions = await submissionsResponse.json();
  if (!submissions.length) throw new Error("There are no submissions to finalize.");

  const winnerSubmission = [...submissions].sort(compareSubmissionScore)[0];
  const winnerWallet = String(winnerSubmission.wallet_address || "");
  if (!winnerWallet) throw new Error("Winning submission is missing a wallet address.");

  const escrowFinalizeTxHash = await finalizeEscrowFromServer(bounty, winnerWallet);
  const updateResponse = await supabaseFetch(`/rest/v1/bounties?id=eq.${encodeFilter(bountyId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      escrow_finalize_tx_hash: escrowFinalizeTxHash,
      escrow_status: "Finalized",
      status: "Completed",
      updated_at: new Date().toISOString(),
      winner_selected_at: new Date().toISOString(),
      winner_submission_id: winnerSubmission.id,
      winner_wallet_address: winnerWallet,
    }),
  });
  const [updated] = await updateResponse.json();
  return updated ? normalizeBounty(updated) : null;
}

async function finalizeExpiredCommunityWinners() {
  const today = new Date().toISOString().slice(0, 10);
  const response = await supabaseFetch(
    `/rest/v1/bounties?select=*&winner_selection=eq.${encodeFilter("Community decides")}&winner_submission_id=is.null&deadline=not.is.null&deadline=lte.${encodeFilter(today)}&status=neq.Completed&order=deadline.asc&limit=25`,
  );
  const candidates = await response.json();
  const finalized: string[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const bounty of candidates) {
    try {
      const finalizedBounty = await finalizeCommunityWinner({ bountyId: bounty.id });
      if (finalizedBounty) finalized.push(String(bounty.id));
    } catch (error) {
      skipped.push({
        id: String(bounty.id),
        reason: error instanceof Error ? error.message : "Could not finalize bounty.",
      });
    }
  }

  return { checked: candidates.length, finalized, skipped };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service credentials are not configured.");

    const body = await request.json();
    const action = String(body.action || "");

    if (action === "finalize_expired_community_winners") {
      verifyCommunityFinalizerCron(request);
      const result = await finalizeExpiredCommunityWinners();
      return jsonResponse(result);
    }

    const privyUserId = await verifyPrivyToken(request);

    if (action === "create_bounty") {
      const bounty = await createBounty(body.bounty);
      return jsonResponse({ bounty, privyUserId });
    }

    if (action === "join_bounty") {
      const bounty = await joinBounty(body);
      return jsonResponse({ bounty, privyUserId });
    }

    if (action === "create_submission") {
      const submission = await createSubmission(body);
      return jsonResponse({ submission, privyUserId });
    }

    if (action === "vote_submission") {
      const submission = await voteSubmission(body);
      return jsonResponse({ submission, vote: Number(body.vote) || 0, privyUserId });
    }

    if (action === "select_creator_winner") {
      const bounty = await selectCreatorWinner(body);
      return jsonResponse({ bounty, privyUserId });
    }

    if (action === "finalize_community_winner") {
      const bounty = await finalizeCommunityWinner(body);
      return jsonResponse({ bounty, privyUserId });
    }

    return jsonResponse({ error: "Unknown marketplace action." }, 400);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Marketplace action failed." }, 401);
  }
});
