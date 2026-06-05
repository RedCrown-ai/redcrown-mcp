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

  it("posts to /experiments/scaffold and returns the scaffold spec", async () => {
    const calls: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ name: "Transcribe audio", quality_metric: "wer" }), { status: 200 });
    }));
    const c = new RedcrownClient("https://api.example", "tok-abc");
    const result = await c.scaffoldExperiment({ task: "Transcribe audio" }) as any;
    expect(calls[0].url).toBe("https://api.example/experiments/scaffold");
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(calls[0].init.body)).toEqual({ task: "Transcribe audio" });
    expect(calls[0].init.headers.Authorization).toBe("Bearer tok-abc");
    expect(result.quality_metric).toBe("wer");
    vi.unstubAllGlobals();
  });

  it("GETs /proxied-endpoints for listProxiedEndpoints", async () => {
    const calls: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
      calls.push({ url, init });
      return new Response(JSON.stringify([]), { status: 200 });
    }));
    const c = new RedcrownClient("https://api.example", "t");
    await c.listProxiedEndpoints();
    expect(calls[0].url).toBe("https://api.example/proxied-endpoints");
    expect(calls[0].init.method).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
