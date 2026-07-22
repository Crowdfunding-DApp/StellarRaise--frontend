import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "src/**/__tests__/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
    ],
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
