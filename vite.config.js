import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import process from "process";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api/gemini": {
          target: "https://generativelanguage.googleapis.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gemini/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("content-type", "application/json");
              const secret =
                env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || "";
              if (!secret) return;
              const raw = proxyReq.path || "";
              const q = raw.indexOf("?");
              const pathname = q >= 0 ? raw.slice(0, q) : raw;
              const params = new URLSearchParams(q >= 0 ? raw.slice(q + 1) : "");
              params.delete("key");
              params.set("key", secret);
              proxyReq.path = `${pathname}?${params.toString()}`;
            });
          },
        },
        "/api/coingecko": {
          target: "https://api.coingecko.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/coingecko/, "/api/v3"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader(
                "x-cg-demo-api-key",
                env.COINGECKO_API_KEY || env.VITE_COINGECKO_API_KEY || "",
              );
              proxyReq.setHeader("accept", "application/json");
            });
          },
        },
      },
    },
  };
});