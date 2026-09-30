
function isAuthorized(req) {
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
  const origin = (req.headers.origin || "").toLowerCase();
  const referer = (req.headers.referer || "").toLowerCase();
  const secFetchSite = (req.headers["sec-fetch-site"] || "").toLowerCase();

  if (secFetchSite === "cross-site") return false;

  // Local development
  if (
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1")
  ) {
    return true;
  }

  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (originHost === host) return true;
      if (host.endsWith(".vercel.app") && originHost.endsWith(".vercel.app")) return true;
      return false;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererHost = new URL(referer).host.toLowerCase();
      if (refererHost === host) return true;
      if (host.endsWith(".vercel.app") && refererHost.endsWith(".vercel.app")) return true;
      return false;
    } catch {
      return false;
    }
  }

  return true;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(403).json({ error: "Forbidden: cross-origin request rejected" });
  }

  const raw = req.query.gemPath;
  const pathPart = Array.isArray(raw)
    ? raw.join("/")
    : typeof raw === "string"
      ? raw.replace(/^\/+/, "")
      : "";

  // Strict endpoint whitelist: only allow generateContent for models
  const isGenerateContent = /^v1beta\/models\/[a-zA-Z0-9._-]+:generateContent$/.test(pathPart);
  if (!isGenerateContent) {
    return res.status(400).json({ error: "Invalid or unauthorized Gemini API endpoint" });
  }

  const key =
    process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  if (!key) {
    return res.status(500).json({ error: "Gemini API key not configured on server" });
  }

  const incoming = new URL(req.url, "http://localhost");
  incoming.searchParams.delete("gemPath");
  incoming.searchParams.delete("key");
  incoming.searchParams.set("key", key);

  const qs = incoming.searchParams.toString();
  const targetUrl = `https://generativelanguage.googleapis.com/${pathPart}${qs ? `?${qs}` : ""}`;

  let bodyContent = req.body;
  if (typeof bodyContent !== "string" && bodyContent != null) {
    bodyContent = JSON.stringify(bodyContent);
  }

  // Prevent excessively large payloads (> 150KB)
  if (bodyContent && bodyContent.length > 150000) {
    return res.status(413).json({ error: "Payload too large" });
  }

  const init = {
    method: "POST",
    headers: {
      "content-type": req.headers["content-type"] || "application/json",
    },
    body: bodyContent,
  };

  try {
    const upstream = await fetch(targetUrl, init);
    const body = await upstream.text();
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    res.status(upstream.status).send(body);
  } catch {
    res.status(502).json({ error: "Gemini proxy failed" });
  }
}

