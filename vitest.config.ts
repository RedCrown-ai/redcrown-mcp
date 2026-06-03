import { defineConfig } from "vitest/config";

// ESM hoists `import` above top-of-file `process.env.X ??=` statements, so a
// module that reads env at import time (app.ts calls loadConfig() at module
// load) would see the vars unset. Setting them here runs before any module
// loads, so loadConfig() succeeds. The test files keep their `??=` lines as
// harmless no-op fallbacks / documentation.
export default defineConfig({
  test: {
    environment: "node",
    env: {
      REDCROWN_API_URL: "https://api.example",
      REDCROWN_AS_ISSUER: "https://as.example",
      REDCROWN_AS_JWKS_URL: "https://as.example/oauth/jwks",
      REDCROWN_RESOURCE_URL: "https://mcp.example",
    },
  },
});
