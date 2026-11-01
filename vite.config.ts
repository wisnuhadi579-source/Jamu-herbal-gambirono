import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error JS module in server
import { handleNodeApi } from "./server/api.js";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "jamu-api-middleware",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && (req.url === "/api/store" || req.url === "/api/owner" || req.url.startsWith("/api/"))) {
            try {
              await handleNodeApi(req, res);
            } catch (err: unknown) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Server error" }));
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    port: 3000,
    host: "0.0.0.0"
  }
});
