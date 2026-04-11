
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const raw = req.query.cgPath;
  const pathPart = Array.isArray(raw)
    ? raw.join("/")
    : typeof raw === "string"
      ? raw.replace(/^\/+/, "")
      : "";

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
      method: req.method,
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
