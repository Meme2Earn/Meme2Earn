import http from "node:http";

const port = Number(process.env.PORT || 3000);
const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(response, status, body) {
  response.writeHead(status, { ...corsHeaders, "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function proxy(request, response, handler) {
  if (!supabaseUrl) return json(response, 503, { error: "Backend storage is not configured." });
  const upstreamHeaders = { Authorization: request.headers.authorization || "" };
  if (request.headers["content-type"]) upstreamHeaders["Content-Type"] = request.headers["content-type"];

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const upstream = await fetch(`${supabaseUrl}/functions/v1/${handler}`, {
    method: request.method,
    headers: upstreamHeaders,
    body: request.method === "GET" ? undefined : Buffer.concat(chunks),
  });
  response.writeHead(upstream.status, {
    ...corsHeaders,
    "Content-Type": upstream.headers.get("content-type") || "application/json",
  });
  response.end(await upstream.text());
}

http.createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders);
      return response.end();
    }
    if (request.method === "GET" && request.url === "/health") return json(response, 200, { status: "ok" });
    if (["GET", "POST"].includes(request.method) && request.url === "/api/profile") return proxy(request, response, "profile");
    if (request.method === "POST" && request.url === "/api/marketplace") return proxy(request, response, "marketplace");
    return json(response, 404, { error: "Not found." });
  } catch {
    return json(response, 502, { error: "Backend request failed." });
  }
}).listen(port, "0.0.0.0");
