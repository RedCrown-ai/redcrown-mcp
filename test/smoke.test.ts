import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

const INIT = {
  jsonrpc: "2.0", id: 1, method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } },
};

describe("mcp streamable http", () => {
  it("responds to initialize", async () => {
    const res = await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send(INIT);
    expect(res.status).toBe(200);
    expect(res.text).toContain("serverInfo");
  });
});
