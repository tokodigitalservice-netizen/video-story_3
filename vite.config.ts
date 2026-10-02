import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Cloudflare Pages の出力先
    outDir: "dist",
    // チャンク分割: hls.js を別バンドルに
    rollupOptions: {
      output: {
        manualChunks: {
          "hls": ["hls.js"],
        },
      },
    },
  },
});
