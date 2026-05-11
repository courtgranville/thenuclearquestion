import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Generate a treemap of the bundle at dist/stats.html on every build.
    // Open in a browser to see what's taking space. Not bundled into the app.
    visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Lift the chunk-size warning so we can see real diagnostics, not noise.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Don't chunk CSS through manualChunks - guard at the top.
          if (id.endsWith('.css')) return;

          // Poster geometry JSON - one chunk per poster so navigating
          // to a poster only downloads that poster's data. nucleus-paths
          // is small (272KB) and shared with the homepage, leave it in
          // the main chunk.
          const posterMatch = id.match(/poster-(\d{3})-forms\.json/);
          if (posterMatch) return `poster-${posterMatch[1]}-data`;

          if (id.includes('node_modules')) {
            // React core - stable, cached across deploys.
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'react';
            }
            // Framer Motion - large, used on every page but stable.
            if (id.includes('framer-motion')) return 'framer-motion';
            // Radix UI - group all into one chunk so a single
            // dropdown menu doesn't pull a fresh chunk download.
            if (id.includes('@radix-ui')) return 'radix';
            // Icons - lucide is tree-shaken per import but the pieces
            // we use go together.
            if (id.includes('lucide-react')) return 'icons';
            // Wouter routing - small, frequently used.
            if (id.includes('wouter')) return 'router';
            // Everything else from node_modules into a single vendor
            // chunk so we don't produce dozens of tiny files.
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
  },
});
