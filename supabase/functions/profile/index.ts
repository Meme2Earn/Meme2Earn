import { importSPKI, jwtVerify } from "npm:jose@5.9.6";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const privyAppId = Deno.env.get("PRIVY_APP_ID") || "";
const privyVerificationKey = Deno.env.get("PRIVY_JWT_VERIFICATION_KEY") || "";
const profileBucket = Deno.env.get("PROFILE_BUCKET") || "profiles";

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

function fileExtension(file: File) {
  const fromName = file.name?.split(".").pop();
  if (fromName && fromName !== file.name) return fromName.toLowerCase();
  return file.type?.split("/").pop() || "png";
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
  return payload.sub;
}

async function uploadAvatar(ownerId: string, file: File) {
  const safeOwner = ownerId.replace(/[^a-zA-Z0-9:_-]/g, "_");
  const path = `${safeOwner}/avatar-${Date.now()}.${fileExtension(file)}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${profileBucket}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "Could not upload profile image.");
  }

  return `${supabaseUrl}/storage/v1/object/public/${profileBucket}/${path}`;
}

async function upsertProfile(profile: {
  avatarUrl: string | null;
  id: string;
  username: string;
  walletAddress: string;
}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([
      {
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatarUrl,
        wallet_address: profile.walletAddress,
        updated_at: new Date().toISOString(),
      },
    ]),
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "Could not save profile.");
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service credentials are not configured.");

    const privyUserId = await verifyPrivyToken(request);
    const formData = await request.formData();
    const username = String(formData.get("username") || "").trim();
    const walletAddress = String(formData.get("walletAddress") || "").trim();
    const currentAvatarUrl = String(formData.get("currentAvatarUrl") || "").trim();
    const avatar = formData.get("avatar");
    const avatarUrl = avatar instanceof File && avatar.size > 0 ? await uploadAvatar(privyUserId, avatar) : currentAvatarUrl;

    await upsertProfile({
      avatarUrl,
      id: privyUserId,
      username,
      walletAddress,
    });

    return jsonResponse({ avatarUrl, id: privyUserId });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Profile save failed." }, 401);
  }
});
