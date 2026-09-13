import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@human-api/contracts": `${root}/packages/contracts/src/index.ts`,
      "@human-api/agent": `${root}/packages/agent/src/index.ts`,
      "@human-api/evidence": `${root}/packages/evidence/src/index.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
  },
});
