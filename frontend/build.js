import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { inspectAttr } from "kimi-plugin-inspect-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Starting clean frontend Vite production build...");

const distDir = path.resolve(__dirname, "dist");
const assetsDir = path.join(distDir, "assets");
if (fs.existsSync(assetsDir)) {
  fs.rmSync(assetsDir, { recursive: true, force: true });
}

try {
  await build({
    configFile: false,
    root: __dirname,
    publicDir: false, // Prevent Vite from copying .htaccess and triggering sandbox EPERM
    plugins: [inspectAttr(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    css: {
      postcss: path.resolve(__dirname, "postcss.config.js"),
    },
    build: {
      emptyOutDir: false,
    },
  });

  // Copy public assets into dist, strictly excluding .htaccess and uploads to comply with cPanel invariants
  const publicDir = path.resolve(__dirname, "public");
  const entries = fs.readdirSync(publicDir);
  for (const entry of entries) {
    if (entry.startsWith(".")) continue; // Exclude .htaccess and dotfiles
    if (entry === "uploads") continue; // Exclude local test uploads; live uploads reside permanently on cPanel
    const srcPath = path.join(publicDir, entry);
    const destPath = path.join(distDir, entry);
    fs.cpSync(srcPath, destPath, { recursive: true, force: true });
  }

  // Also mirror build output to root dist directory so root-based Vercel deployments find it immediately
  const rootDistDir = path.resolve(__dirname, "../dist");
  if (rootDistDir !== distDir) {
    const rootAssetsDir = path.join(rootDistDir, "assets");
    if (fs.existsSync(rootAssetsDir)) {
      fs.rmSync(rootAssetsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(rootDistDir, { recursive: true });
    fs.cpSync(distDir, rootDistDir, { recursive: true, force: true });
  }

  console.log("✅ Frontend Vite build completed successfully!");
} catch (error) {
  console.error("❌ Frontend build error:", error);
  process.exit(1);
}
