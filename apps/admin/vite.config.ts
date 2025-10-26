// apps/admin/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/admin/" : "/", // keep for correct asset paths in Docker
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // In dev, forward /backend/* to your local API /api/*
      "/backend": {
        target: process.env.VITE_PROXY_TARGET ?? "http://localhost:4000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/backend/, "/api"),
      },
    },
  },
});
