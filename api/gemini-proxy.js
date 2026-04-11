/**
 * Production proxy for Google Generative Language API.
 * Set GEMINI_API_KEY or VITE_GEMINI_API_KEY in Vercel (prefer GEMINI_API_KEY).
 */
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const raw = req.query.gemPath;
  const pathPart = Array.isArray(raw)
    ? raw.join("/")
    : typeof raw === "string"
      ? raw.replace(/^\/+/, "")
      : "";

  const incoming = new URL(req.url, "http://localhost");
  incoming.searchParams.delete("gemPath");
  incoming.searchParams.delete("key");

  const key =
    process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  if (key) incoming.searchParams.set("key", key);

  const qs = incoming.searchParams.toString();
  const targetUrl = `https://generativelanguage.googleapis.com/${pathPart}${qs ? `?${qs}` : ""}`;

  const init = {
    method: req.method,
    headers: {
      "content-type": req.headers["content-type"] || "application/json",
    },
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (typeof req.body === "string") {
      init.body = req.body;
    } else if (req.body != null) {
      init.body = JSON.stringify(req.body);
    }
  }

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
