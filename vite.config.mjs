import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "client",
  base: "/experience/",
  publicDir: false,
  build: {
    outDir: path.resolve(import.meta.dirname, "public/experience"),
    emptyOutDir: true,
    assetsDir: ".",
    sourcemap: false,
    target: "es2020",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: path.resolve(import.meta.dirname, "client/index.html"),
      output: {
        entryFileNames: "experience.js",
        chunkFileNames: "chunk-[name].js",
        assetFileNames: "experience[extname]"
      }
    }
  }
});
