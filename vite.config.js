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
                env.VITE_COINGECKO_API_KEY || "",
              );
              proxyReq.setHeader("accept", "application/json");
            });
          },
        },
      },
    },
  };
});