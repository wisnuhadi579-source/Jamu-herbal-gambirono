import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleNodeApi } from './server/api.js';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'jamu-api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && (req.url === '/api/store' || req.url === '/api/owner' || req.url.startsWith('/api/'))) {
            try {
              await handleNodeApi(req, res);
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
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
    host: '0.0.0.0'
  }
});
