import { describe, it, expect, vi, beforeEach } from "vitest";
import { RedcrownClient } from "../src/restClient.js";

beforeEach(() => vi.restoreAllMocks());

describe("RedcrownClient", () => {
  it("forwards the bearer token and returns JSON", async () => {
    const calls: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ providers: [], presets: [], free_presets: [] }), { status: 200 });
    }));
    const c = new RedcrownClient("https://api.example", "tok-123");
    const r = await c.listModels();
    expect(r.free_presets).toEqual([]);
    expect(calls[0].url).toBe("https://api.example/providers");
    expect(calls[0].init.headers.Authorization).toBe("Bearer tok-123");
    vi.unstubAllGlobals();
  });

  it("throws with the backend error detail on non-2xx", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ detail: "nope" }), { status: 400 })));
    const c = new RedcrownClient("https://api.example", "t");
    await expect(c.listExperiments()).rejects.toThrow(/nope/);
    vi.unstubAllGlobals();
  });

  it("posts the experiment body to /experiments", async () => {
    const calls: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: "e1" }), { status: 201 });
    }));
    const c = new RedcrownClient("https://api.example", "t");
    await c.createExperiment({ name: "x" });
    expect(calls[0].url).toBe("https://api.example/experiments");
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(calls[0].init.body)).toEqual({ name: "x" });
    vi.unstubAllGlobals();
  });
});
