import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    // No source maps in production to avoid exposing original source
    sourcemap: false,
    // Minify aggressively
    minify: "esbuild",
    // Strip comments, jsdoc and legal comments
    cssMinify: true,
    rollupOptions: {
      output: {
        // Hash output files so internal route/component names are not guessable
        entryFileNames: "assets/[hash].js",
        chunkFileNames: "assets/[hash].js",
        assetFileNames: "assets/[hash][extname]",
      },
    },
  },
  esbuild: mode === "production"
    ? {
        // Remove console.* and debugger statements from the production bundle
        drop: ["console", "debugger"],
        legalComments: "none",
      }
    : undefined,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "placeholder.svg"],
      manifest: {
        name: "Football Life Manager",
        short_name: "FLM",
        description: "O manager de futebol definitivo.",
        theme_color: "#0a0a0c",
        background_color: "#0a0a0c",
        display: "standalone",
        icons: [
          {
            src: "/placeholder.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/placeholder.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4000000,
        navigateFallbackDenylist: [/^\/~oauth/],
      }
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
