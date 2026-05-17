import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", ".expo"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      exclude: ["node_modules/", "__tests__/", "*.config.*", "*.d.ts"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
