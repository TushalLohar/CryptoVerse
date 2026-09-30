
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

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(403).json({ error: "Forbidden: cross-origin request rejected" });
  }

  const raw = req.query.cgPath;
  const pathPart = Array.isArray(raw)
    ? raw.join("/")
    : typeof raw === "string"
      ? raw.replace(/^\/+/, "")
      : "";

  // Prevent path traversal
  if (pathPart.includes("..") || /[^a-zA-Z0-9_\-\/]/i.test(pathPart)) {
    return res.status(400).json({ error: "Invalid path" });
  }

  const incoming = new URL(req.url, "http://localhost");
  incoming.searchParams.delete("cgPath");
  const qs = incoming.searchParams.toString();

  const targetUrl = `https://api.coingecko.com/api/v3/${pathPart}${qs ? `?${qs}` : ""}`;

  const apiKey =
    process.env.COINGECKO_API_KEY ||
    process.env.VITE_COINGECKO_API_KEY ||
    "";

  try {
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(apiKey ? { "x-cg-demo-api-key": apiKey } : {}),
      },
    });

    const body = await upstream.text();
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    res.status(upstream.status).send(body);
  } catch {
    res.status(502).json({ error: "CoinGecko proxy failed" });
  }
}

