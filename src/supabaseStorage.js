const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "");
const profileFunctionUrl = backendUrl
  ? `${backendUrl}/api/profile`
  : import.meta.env.VITE_SUPABASE_PROFILE_FUNCTION_URL;
const marketplaceFunctionUrl = backendUrl
  ? `${backendUrl}/api/marketplace`
  : import.meta.env.VITE_SUPABASE_MARKETPLACE_FUNCTION_URL;
const bountyImageBucket = "bounty-images";
const submissionVideoBucket = "submission-videos";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isSecureProfileStorageConfigured = Boolean(profileFunctionUrl);
export const isSecureMarketplaceConfigured = Boolean(marketplaceFunctionUrl);

function cleanBaseUrl(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol.");
    return parsed.origin;
  } catch {
    throw new Error("Supabase URL is invalid. Check VITE_SUPABASE_URL in .env.");
  }
}

async function parseJsonResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  if (!contentType.includes("application/json")) {
    const preview = body.trim().slice(0, 80);
    throw new Error(preview.startsWith("<!doctype") || preview.startsWith("<html")
      ? `${fallbackMessage} The server returned HTML instead of JSON. Check the configured URL.`
      : body || fallbackMessage);
  }

  try {
    return body ? JSON.parse(body) : null;
  } catch {
    throw new Error(`${fallbackMessage} The server returned invalid JSON.`);
  }
}

async function getResponseError(response, fallbackMessage) {
  const body = await response.text();
  if (!body) return fallbackMessage;

  try {
    const parsed = JSON.parse(body);
    return parsed.message || parsed.error || fallbackMessage;
  } catch {
    return body;
  }
}

function normalizeErrorMessage(message, fallbackMessage) {
  if (!message) return fallbackMessage;

  try {
    const parsed = JSON.parse(message);
    return parsed.message || parsed.error || fallbackMessage;
  } catch {
    return message;
  }
}

function bountyFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    category: row.category,
    reward: Number(row.reward) || 0,
    coin: row.coin,
    deadline: row.deadline || "",
    daysLeft: row.deadline ? Math.max(0, Math.ceil((new Date(row.deadline) - new Date()) / 86400000)) : 0,
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

function bountyToRow(bounty) {
  return {
    id: String(bounty.id),
    title: bounty.title,
    description: bounty.description || "",
    category: bounty.category,
    reward: bounty.reward,
    coin: bounty.coin,
    deadline: bounty.deadline || null,
    applicants: bounty.applicants || 0,
    max_applicants: bounty.maxApplicants || 1,
    status: bounty.status,
    poster: bounty.poster,
    image_url: bounty.image || null,
    funding_type: bounty.fundingType || "Self-Funded Dare",
    winner_selection: bounty.winnerSelection || "Community decides",
    winner_submission_id: bounty.winnerSubmissionId || null,
    winner_wallet_address: bounty.winnerWalletAddress || null,
    winner_selected_at: bounty.winnerSelectedAt || null,
    token_address: bounty.tokenAddress || "",
    escrow_address: bounty.escrowAddress || "",
    escrow_bounty_id: bounty.escrowBountyId || "",
    escrow_tx_hash: bounty.escrowTxHash || "",
    escrow_status: bounty.escrowStatus || "",
    escrow_finalize_tx_hash: bounty.escrowFinalizeTxHash || "",
  };
}

function joinFromRow(row) {
  return {
    bountyId: row.bounty_id,
    walletAddress: row.wallet_address,
    username: row.username || "",
    avatar: row.avatar_url || "",
    createdAt: row.created_at,
  };
}

function submissionFromRow(row) {
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
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString() : "",
  };
}

function safeStorageSegment(value) {
  return String(value || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function voteFromRow(row) {
  return {
    submissionId: row.submission_id,
    vote: Number(row.vote) || 0,
  };
}

async function callMarketplaceFunction({ action, getAccessToken, payload }) {
  if (!isSecureMarketplaceConfigured) return null;

  const accessToken = await getAccessToken?.();
  if (!accessToken) {
    throw new Error("Login session expired. Please login again.");
  }

  const response = await fetch(marketplaceFunctionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const result = await parseJsonResponse(response, "Marketplace request failed.").catch(() => ({}));
  if (!response.ok) {
    throw new Error(normalizeErrorMessage(result.error, "Marketplace request failed."));
  }

  return result;
}

export async function fetchBounties() {
  if (!isSupabaseConfigured) return { stored: false, bounties: [] };

  const baseUrl = cleanBaseUrl(supabaseUrl);
  const response = await fetch(`${baseUrl}/rest/v1/bounties?select=*&order=created_at.desc`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not load bounties.");
  }

  const rows = await parseJsonResponse(response, "Could not load bounties.");
  return { stored: true, bounties: rows.map(bountyFromRow) };
}

export async function uploadBountyImage({ bountyId, file, walletAddress }) {
  if (!isSupabaseConfigured || !file) return { stored: false, imageUrl: "" };
  if (!file.type?.startsWith("image/")) throw new Error("Bounty image must be an image file.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Bounty image must be 10 MB or smaller.");

  const baseUrl = cleanBaseUrl(supabaseUrl);
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = [
    safeStorageSegment(walletAddress),
    safeStorageSegment(bountyId),
    `${Date.now()}-${safeStorageSegment(file.name || `bounty.${extension}`)}`,
  ].join("/");

  const response = await fetch(`${baseUrl}/storage/v1/object/${bountyImageBucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "false",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(await getResponseError(response, "Could not upload bounty image."));
  }

  return {
    stored: true,
    imagePath: path,
    imageUrl: `${baseUrl}/storage/v1/object/public/${bountyImageBucket}/${path}`,
  };
}

export async function createBountyRecord({ bounty, getAccessToken }) {
  const secureResult = await callMarketplaceFunction({
    action: "create_bounty",
    getAccessToken,
    payload: { bounty },
  });
  if (secureResult) return { stored: true, bounty: secureResult.bounty };

  if (!isSupabaseConfigured) return { stored: false, bounty };

  const baseUrl = cleanBaseUrl(supabaseUrl);
  const response = await fetch(`${baseUrl}/rest/v1/bounties`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify([bountyToRow(bounty)]),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not create bounty.");
  }

  const [row] = await parseJsonResponse(response, "Could not create bounty.");
  return { stored: true, bounty: bountyFromRow(row) };
}

export async function validateBountyRecord({ bounty, getAccessToken }) {
  const secureResult = await callMarketplaceFunction({
    action: "validate_bounty",
    getAccessToken,
    payload: { bounty },
  });
  return { validated: Boolean(secureResult?.valid) };
}

export async function fetchBountyJoins(walletAddress) {
  if (!isSupabaseConfigured || !walletAddress) return { stored: false, joins: [] };

  const baseUrl = cleanBaseUrl(supabaseUrl);
  const wallet = encodeURIComponent(walletAddress);
  const response = await fetch(`${baseUrl}/rest/v1/bounty_joins?select=*&wallet_address=eq.${wallet}`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not load joined bounties.");
  }

  const rows = await parseJsonResponse(response, "Could not load joined bounties.");
  return { stored: true, joins: rows.map(joinFromRow) };
}

export async function joinBountyRecord({ bountyId, getAccessToken, walletAddress, profile }) {
  const secureResult = await callMarketplaceFunction({
    action: "join_bounty",
    getAccessToken,
    payload: { bountyId, profile, walletAddress },
  });
  if (secureResult) return { stored: true, bounty: secureResult.bounty };

  if (!isSupabaseConfigured) return { stored: false, bounty: null };

  const baseUrl = cleanBaseUrl(supabaseUrl);
  const response = await fetch(`${baseUrl}/rest/v1/rpc/join_bounty`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target_bounty_id: String(bountyId),
      user_wallet: walletAddress,
      user_username: profile?.username || "",
      user_avatar: profile?.avatar || "",
    }),
  });

  if (!response.ok) {
    const message = await getResponseError(response, "Could not join bounty.");
    throw new Error(message || "Could not join bounty.");
  }

  const rows = await parseJsonResponse(response, "Could not join bounty.");
  return { stored: true, bounty: rows[0] ? bountyFromRow(rows[0]) : null };
}

export async function fetchSubmissions() {
  if (!isSupabaseConfigured) return { stored: false, submissions: {} };

  const baseUrl = cleanBaseUrl(supabaseUrl);
  const response = await fetch(`${baseUrl}/rest/v1/bounty_submissions?select=*&order=created_at.desc`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not load submissions.");
  }

  const rows = await parseJsonResponse(response, "Could not load submissions.");
  const submissions = rows.map(submissionFromRow).reduce((grouped, submission) => {
    grouped[submission.bountyId] = [...(grouped[submission.bountyId] || []), submission];
    return grouped;
  }, {});

  return { stored: true, submissions };
}

export async function fetchSubmissionVotes(walletAddress) {
  if (!isSupabaseConfigured || !walletAddress) return { stored: false, votes: {} };

  const baseUrl = cleanBaseUrl(supabaseUrl);
  const wallet = encodeURIComponent(walletAddress);
  const response = await fetch(`${baseUrl}/rest/v1/bounty_submission_votes?select=submission_id,vote&wallet_address=eq.${wallet}`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not load submission votes.");
  }

  const rows = await parseJsonResponse(response, "Could not load submission votes.");
  const votes = rows.map(voteFromRow).reduce((grouped, vote) => {
    grouped[vote.submissionId] = vote.vote;
    return grouped;
  }, {});

  return { stored: true, votes };
}

export async function createSubmissionRecord({ bountyId, getAccessToken, submission, walletAddress, profile }) {
  const secureResult = await callMarketplaceFunction({
    action: "create_submission",
    getAccessToken,
    payload: { bountyId, profile, submission, walletAddress },
  });
  if (secureResult) return { stored: true, submission: secureResult.submission };

  if (!isSupabaseConfigured) return { stored: false, submission };

  const baseUrl = cleanBaseUrl(supabaseUrl);
  const response = await fetch(`${baseUrl}/rest/v1/bounty_submissions`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        id: String(submission.id),
        bounty_id: String(bountyId),
        wallet_address: walletAddress,
        author: profile?.username || walletAddress,
        avatar_url: profile?.avatar || "",
        text: submission.text,
        video_name: submission.videoName || "",
        video_path: submission.videoPath || "",
        video_type: submission.videoType || "",
        video_url: submission.videoUrl || "",
      },
    ]),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not save submission.");
  }

  const [row] = await parseJsonResponse(response, "Could not save submission.");
  return { stored: true, submission: submissionFromRow(row) };
}

export async function uploadSubmissionVideo({ bountyId, file, walletAddress }) {
  if (!isSupabaseConfigured || !file) return { stored: false, videoUrl: "" };

  const baseUrl = cleanBaseUrl(supabaseUrl);
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "mp4";
  const path = [
    safeStorageSegment(walletAddress),
    safeStorageSegment(bountyId),
    `${Date.now()}-${safeStorageSegment(file.name || `submission.${extension}`)}`,
  ].join("/");

  const response = await fetch(`${baseUrl}/storage/v1/object/${submissionVideoBucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": file.type || "video/mp4",
      "x-upsert": "false",
    },
    body: file,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not upload video.");
  }

  return {
    stored: true,
    videoName: file.name || "submission video",
    videoPath: path,
    videoType: file.type || "video/mp4",
    videoUrl: `${baseUrl}/storage/v1/object/public/${submissionVideoBucket}/${path}`,
  };
}

export async function voteSubmissionRecord({ getAccessToken, submissionId, bountyId, walletAddress, vote }) {
  const secureResult = await callMarketplaceFunction({
    action: "vote_submission",
    getAccessToken,
    payload: { bountyId, submissionId, vote, walletAddress },
  });
  if (secureResult) return { stored: true, submission: secureResult.submission, vote: secureResult.vote };

  if (!isSupabaseConfigured) return { stored: false, submission: null, vote };

  throw new Error("Secure marketplace voting is not configured.");
}

export async function selectCreatorWinnerRecord({ bountyId, escrowFinalizeTxHash = "", getAccessToken, submissionId, walletAddress }) {
  const secureResult = await callMarketplaceFunction({
    action: "select_creator_winner",
    getAccessToken,
    payload: { bountyId, escrowFinalizeTxHash, submissionId, walletAddress },
  });
  if (secureResult) return { stored: true, bounty: secureResult.bounty };

  if (!isSupabaseConfigured) return { stored: false, bounty: null };

  throw new Error("Secure winner selection is not configured.");
}

export async function finalizeCommunityWinnerRecord({ bountyId, getAccessToken, walletAddress }) {
  const secureResult = await callMarketplaceFunction({
    action: "finalize_community_winner",
    getAccessToken,
    payload: { bountyId, walletAddress },
  });
  if (secureResult) return { stored: true, bounty: secureResult.bounty };

  if (!isSupabaseConfigured) return { stored: false, bounty: null };

  throw new Error("Secure community finalization is not configured.");
}

export async function saveProfileWithPrivy({ getAccessToken, profile, walletAddress }) {
  if (!isSecureProfileStorageConfigured) return { stored: false };

  const accessToken = await getAccessToken?.();
  if (!accessToken) {
    throw new Error("Login session expired. Please login again.");
  }

  const formData = new FormData();
  formData.append("username", profile.username || "");
  formData.append("walletAddress", walletAddress || "");
  formData.append("currentAvatarUrl", profile.avatar || "");

  const response = await fetch(profileFunctionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const result = await parseJsonResponse(response, "Could not save profile.").catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Could not save profile.");
  }

  return {
    avatarUrl: result.avatarUrl || profile.avatar,
    stored: true,
  };
}

export async function fetchProfileWithPrivy({ getAccessToken }) {
  if (!isSecureProfileStorageConfigured) return { stored: false };
  const accessToken = await getAccessToken?.();
  if (!accessToken) throw new Error("Login session expired. Please login again.");

  const response = await fetch(profileFunctionUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const result = await parseJsonResponse(response, "Could not load profile.").catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Could not load profile.");
  return { ...result, stored: true };
}

export async function acceptTermsWithPrivy({ getAccessToken, walletAddress }) {
  if (!isSecureProfileStorageConfigured) return { stored: false };
  const accessToken = await getAccessToken?.();
  if (!accessToken) throw new Error("Login session expired. Please login again.");

  const formData = new FormData();
  formData.append("action", "accept_terms");
  formData.append("walletAddress", walletAddress || "");
  const response = await fetch(profileFunctionUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  const result = await parseJsonResponse(response, "Could not save terms acceptance.").catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Could not save terms acceptance.");
  return { ...result, stored: true };
}

export async function saveProfileRecord({ walletAddress, profile }) {
  if (!isSupabaseConfigured || !walletAddress) return { stored: false };

  const baseUrl = cleanBaseUrl(supabaseUrl);
  const response = await fetch(`${baseUrl}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([
      {
        id: walletAddress,
        username: profile.username,
        avatar_url: profile.avatar,
        updated_at: new Date().toISOString(),
      },
    ]),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not save profile.");
  }

  return { stored: true };
}
