import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import process from "process";

export default defineConfig({
  // plugins = tools Vite uses during the build process
  plugins: [
    react(), // transforms JSX into JavaScript the browser understands
    tailwind(), // scans your files and generates only the CSS classes you actually used
  ],

  server: {
    // This is a proxy — during development, any request to /api/claude
    // gets secretly forwarded to Anthropic's real server
    // This way your API key is NEVER exposed in the browser
    proxy: {
      // Anthropic — MUST proxy (billing risk)
      "/api/claude": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/claude/, "/v1/messages"),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader(
              "x-api-key",
              process.env.VITE_ANTHROPIC_API_KEY || "",
            );
            proxyReq.setHeader("anthropic-version", "2023-06-01");
            proxyReq.setHeader("content-type", "application/json");
          });
        },
      },

      // CoinGecko — proxy for best security practice
      "/api/coingecko": {
        target: "https://api.coingecko.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/coingecko/, "/api/v3"),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader(
              "x-cg-demo-api-key",
              process.env.VITE_COINGECKO_API_KEY || "",
            );
            proxyReq.setHeader("accept", "application/json");
          });
        },
      },
    },
  },
});
