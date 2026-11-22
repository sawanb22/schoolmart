import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { inspectAttr } from "kimi-plugin-inspect-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === "development" && process.env.NODE_ENV !== "production";

  return {
    plugins: [
      ...(isDev ? [inspectAttr()] : []),
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
      host: true,
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
    build: {
      target: "es2020",
      rollupOptions: {
        output: {
          manualChunks(id) {
            const nId = id.replace(/\\/g, "/");
            if (!nId.includes("node_modules")) return;

            if (
              nId.includes("node_modules/react/") ||
              nId.includes("node_modules/react-dom/") ||
              nId.includes("node_modules/scheduler/")
            ) {
              return "react";
            }
            if (
              nId.includes("node_modules/react-router/") ||
              nId.includes("node_modules/react-router-dom/")
            ) {
              return "router";
            }
            if (nId.includes("node_modules/@tanstack/")) {
              return "query";
            }
            if (
              nId.includes("node_modules/gsap/") ||
              nId.includes("node_modules/@gsap/")
            ) {
              return "gsap";
            }
            if (nId.includes("node_modules/@radix-ui/")) {
              return "radix";
            }
            if (nId.includes("node_modules/lucide-react/")) {
              return "icons";
            }
          },
        },
      },
    },
  };
});
