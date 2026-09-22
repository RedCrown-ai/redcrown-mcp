process.env.REDCROWN_API_URL ??= "https://api.example";
process.env.REDCROWN_AS_ISSUER ??= "https://as.example";
process.env.REDCROWN_AS_JWKS_URL ??= "https://as.example/oauth/jwks";
process.env.REDCROWN_RESOURCE_URL ??= "https://mcp.example";

import { describe, it, expect } from "vitest";
import { INSTRUCTIONS } from "../src/server.js";

describe("server instructions", () => {
  it("leads with the regression check, not model choice", () => {
    expect(INSTRUCTIONS).toMatch(/regress/i);
    expect(INSTRUCTIONS).not.toMatch(/cheapest/i);
    expect(INSTRUCTIONS).toMatch(/import_results/);
  });
});
