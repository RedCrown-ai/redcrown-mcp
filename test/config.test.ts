import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config.js";

describe("config", () => {
  it("reads env with sensible defaults", () => {
    const c = loadConfig({
      REDCROWN_API_URL: "https://api.example",
      REDCROWN_AS_ISSUER: "https://as.example",
      REDCROWN_AS_JWKS_URL: "https://as.example/oauth/jwks",
      REDCROWN_RESOURCE_URL: "https://mcp.example",
    });
    expect(c.apiUrl).toBe("https://api.example");
    expect(c.issuer).toBe("https://as.example");
    expect(c.jwksUrl).toBe("https://as.example/oauth/jwks");
    expect(c.resourceUrl).toBe("https://mcp.example");
  });

  it("throws when a required var is missing", () => {
    expect(() => loadConfig({})).toThrow();
  });
});
