process.env.REDCROWN_API_URL ??= "https://api.example";
process.env.REDCROWN_AS_ISSUER ??= "https://as.example";
process.env.REDCROWN_AS_JWKS_URL ??= "https://as.example/oauth/jwks";
process.env.REDCROWN_RESOURCE_URL ??= "https://mcp.example";

import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("app auth gating", () => {
  it("returns 401 + WWW-Authenticate on the MCP endpoint without a token", async () => {
    const res = await request(app).post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } });
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toContain("resource_metadata");
  });

  it("serves protected-resource metadata", async () => {
    const res = await request(app).get("/.well-known/oauth-protected-resource");
    expect(res.status).toBe(200);
    expect(res.body.authorization_servers.length).toBeGreaterThan(0);
  });

  it("serves a human-readable landing page at / (no auth)", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("RedCrown");
    expect(res.text).toContain("prove_task");
    // the connect instructions carry this server's own resource URL
    expect(res.text).toContain("https://mcp.example");
    // anonymity: no personal or company identity leaks onto the public page
    expect(res.text).not.toMatch(/Beau|Method Data Science/i);
  });
});
