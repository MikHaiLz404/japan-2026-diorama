import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    // three.js (~550 kB) and maplibre-gl (~800 kB) get their own long-lived chunks; the app chunk stays small.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Both libraries change rarely; separate chunks stay cached across app deploys.
        manualChunks: { three: ["three"], maplibre: ["maplibre-gl"] },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
