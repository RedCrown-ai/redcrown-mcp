import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../src/tools.js";

function fakeClient(calls: string[]) {
  return {
    listModels: async () => { calls.push("listModels"); return { providers: [], presets: [], free_presets: [] }; },
    listExperiments: async () => { calls.push("listExperiments"); return { experiments: [] }; },
    getRun: async (id: string) => {
      calls.push(`getRun:${id}`);
      return { id, status: "complete", report: { per_step: { s1: [
        { label: "Winner", is_winner: true, is_incumbent: false, mean_quality: 0.9, savings_vs_incumbent: 0.4, clears_bar: true },
        { label: "Current", is_winner: false, is_incumbent: true, mean_quality: 0.88, clears_bar: true },
      ] } } };
    },
    createExperiment: async (_b: unknown) => { calls.push("createExperiment"); return { id: "e1" }; },
    runExperiment: async (id: string) => { calls.push(`runExperiment:${id}`); return { id: "r1", status: "queued" }; },
    costEstimate: async (m: string) => { calls.push(`costEstimate:${m}`); return { model: m, projected_api_cost_usd: 0.001, self_hosted: null }; },
    scaffoldExperiment: async (_b: unknown) => { calls.push("scaffoldExperiment"); return { name: "s", quality_metric: "wer", quality_bar: 0.8 }; },
    importResults: async (_b: unknown) => { calls.push("importResults"); return { experiment_id: "e1", run_id: "r1" }; },
    createProofLink: async (_id: string, _b: unknown) => { calls.push("createProofLink"); return { token: "ptok" }; },
    getProof: async (t: string) => { calls.push(`getProof:${t}`); return { report: { per_step: { s1: [
      { label: "Sample Winner", is_winner: true, mean_quality: 0.88, savings_vs_incumbent: 0.4, clears_bar: true },
    ] } } }; },
    createProxiedEndpoint: async (_b: unknown) => { calls.push("createProxiedEndpoint"); return { id: "pe1" }; },
    listProxiedEndpoints: async () => { calls.push("listProxiedEndpoints"); return []; },
    replayCaptures: async (id: string) => { calls.push(`replayCaptures:${id}`); return { run_id: "r1" }; },
    createReviewSession: async (_b: unknown) => { calls.push("createReviewSession"); return { id: "rs1" }; },
    addReviewer: async (sid: string, _b: unknown) => { calls.push(`addReviewer:${sid}`); return { token: "tok" }; },
    getReviewExamples: async (id: string) => { calls.push(`getReviewExamples:${id}`); return []; },
    getDecisionReport: async (id: string) => { calls.push(`getDecisionReport:${id}`); return { winner: null }; },
  };
}

function build(calls: string[]) {
  const server = new McpServer({ name: "t", version: "1" });
  const names: string[] = [];
  const handlers: Record<string, (a: any) => Promise<any>> = {};
  const orig = server.registerTool.bind(server);
  (server as any).registerTool = (n: string, cfg: any, h: any) => { names.push(n); handlers[n] = h; return orig(n, cfg, h); };
  registerTools(server, () => fakeClient(calls) as any);
  return { names, handlers };
}

describe("registerTools", () => {
  it("registers the core + advanced prove-loop tools", () => {
    const { names } = build([]);
    expect(new Set(names)).toEqual(new Set([
      "prove_task", "try_sample", "import_results", "get_run", "get_report",
      "list_models", "list_experiments", "create_experiment", "run_experiment", "scaffold_experiment", "simulate_cost",
      "setup_proxy", "list_proxies", "replay_captures",
      "create_review", "invite_reviewer", "get_review_examples", "get_decision_report",
    ]));
    expect(names).toHaveLength(18);
  });

  it("registers prove_task and try_sample as the first (core) tools", () => {
    const { names } = build([]);
    expect(names.slice(0, 2)).toEqual(["prove_task", "try_sample"]);
  });

  it("prove_task scaffolds, creates, runs, and returns a proof url + winner", async () => {
    const calls: string[] = [];
    const { handlers } = build(calls);
    const res = await handlers["prove_task"]({ task: "classify tickets", examples: [{ input: "a", output: "b" }] });
    const out = JSON.parse(res.content[0].text);
    expect(calls).toContain("scaffoldExperiment");
    expect(calls).toContain("createExperiment");
    expect(calls).toContain("createProofLink");
    expect(out.proof_url).toBe("https://app.redcrown.ai/proof/ptok");
    expect(out.winner.label).toBe("Winner");
    expect(out.ranked).toHaveLength(2);
  });

  it("prove_task asks for examples when none are given", async () => {
    const { handlers } = build([]);
    const res = await handlers["prove_task"]({ task: "classify tickets" });
    expect(JSON.parse(res.content[0].text).error).toMatch(/example/i);
  });

  it("try_sample returns a public sample proof url with no input", async () => {
    const { handlers } = build([]);
    const res = await handlers["try_sample"]({});
    const out = JSON.parse(res.content[0].text);
    expect(out.sample).toBe(true);
    expect(out.proof_url).toContain("/proof/");
    expect(out.winner.label).toBe("Sample Winner");
  });
});
