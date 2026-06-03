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
  };
}

describe("registerTools", () => {
  it("registers the 7 prove-loop tools", () => {
    const server = new McpServer({ name: "t", version: "1" });
    const names: string[] = [];
    const orig = server.registerTool.bind(server);
    (server as any).registerTool = (n: string, ...rest: any[]) => { names.push(n); return orig(n, ...rest); };
    registerTools(server, () => fakeClient([]) as any);
    expect(new Set(names)).toEqual(new Set([
      "list_models", "create_experiment", "run_experiment",
      "get_report", "list_experiments", "get_run", "simulate_cost",
    ]));
  });
});
