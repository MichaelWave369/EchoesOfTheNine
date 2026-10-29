import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages is served from /EchoesOfTheNine/, not the domain root.
// A separate Vite entry avoids changing Grok Build's TanStack Start preview.
export default defineConfig({
  root: path.join(repoRoot, "pages"),
  publicDir: path.join(repoRoot, "public"),
  base: process.env.PAGES_BASE_PATH || "/EchoesOfTheNine/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.join(repoRoot, "dist-pages"),
    emptyOutDir: true,
  },
});
