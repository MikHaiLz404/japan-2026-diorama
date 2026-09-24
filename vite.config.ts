import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    // The dedicated three.js chunk is ~550 kB on its own; the app chunk stays small.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // three.js changes rarely; a separate chunk stays cached across app deploys.
        manualChunks: { three: ["three"] },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
