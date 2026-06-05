import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../src/tools.js";

function fakeClient(calls: string[]) {
  return {
    listModels: async () => { calls.push("listModels"); return { providers: [], presets: [], free_presets: [] }; },
    listExperiments: async () => { calls.push("listExperiments"); return { experiments: [] }; },
    getRun: async (id: string) => { calls.push(`getRun:${id}`); return { id, status: "complete" }; },
    createExperiment: async (_b: unknown) => { calls.push("createExperiment"); return { id: "e1" }; },
    runExperiment: async (id: string) => { calls.push(`runExperiment:${id}`); return { id: "r1", status: "queued" }; },
    costEstimate: async (m: string) => { calls.push(`costEstimate:${m}`); return { model: m, projected_api_cost_usd: 0.001, self_hosted: null }; },
    scaffoldExperiment: async (_b: unknown) => { calls.push("scaffoldExperiment"); return { name: "s", quality_metric: "wer" }; },
    createProxiedEndpoint: async (_b: unknown) => { calls.push("createProxiedEndpoint"); return { id: "pe1" }; },
    listProxiedEndpoints: async () => { calls.push("listProxiedEndpoints"); return []; },
    replayCaptures: async (id: string) => { calls.push(`replayCaptures:${id}`); return { run_id: "r1" }; },
    createReviewSession: async (_b: unknown) => { calls.push("createReviewSession"); return { id: "rs1" }; },
    addReviewer: async (sid: string, _b: unknown) => { calls.push(`addReviewer:${sid}`); return { token: "tok" }; },
    getReviewExamples: async (id: string) => { calls.push(`getReviewExamples:${id}`); return []; },
    getDecisionReport: async (id: string) => { calls.push(`getDecisionReport:${id}`); return { winner: null }; },
  };
}

describe("registerTools", () => {
  it("registers all 15 prove-loop tools", () => {
    const server = new McpServer({ name: "t", version: "1" });
    const names: string[] = [];
    const orig = server.registerTool.bind(server);
    (server as any).registerTool = (n: string, ...rest: any[]) => { names.push(n); return orig(n, ...rest); };
    registerTools(server, () => fakeClient([]) as any);
    expect(new Set(names)).toEqual(new Set([
      "list_models", "create_experiment", "run_experiment",
      "get_report", "list_experiments", "get_run", "simulate_cost",
      "scaffold_experiment", "setup_proxy", "list_proxies", "replay_captures",
      "create_review", "invite_reviewer", "get_review_examples", "get_decision_report",
    ]));
    expect(names).toHaveLength(15);
  });
});
