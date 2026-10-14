/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In Compose the SPA reaches the API through this proxy, so the browser only ever
// talks to one origin and no CORS configuration is needed on the Rails side.
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Compose service names (dev and e2e) are the Host headers other containers use.
    allowedHosts: ["localhost", "frontend", "frontend-e2e"],
    proxy: { "/api": apiTarget, "/up": apiTarget },
    watch: { usePolling: true },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
