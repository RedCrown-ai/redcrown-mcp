import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../src/tools.js";
import { ApiError } from "../src/restClient.js";

function fakeClient(calls: string[]) {
  return {
    listModels: async () => { calls.push("listModels"); return { providers: [], presets: [], free_presets: [] }; },
    listExperiments: async () => { calls.push("listExperiments"); return { experiments: [] }; },
    getRun: async (id: string) => {
      calls.push(`getRun:${id}`);
      return { id, status: "complete", report: { grading_caveat: "re-run so every item is scored", per_step: { s1: [
        { label: "Winner", is_winner: true, is_incumbent: false, mean_quality: 0.9, savings_vs_incumbent: 0.4, clears_bar: true, n_scored: 3 },
        { label: "Current", is_winner: false, is_incumbent: true, mean_quality: 0.88, clears_bar: true, n_scored: 3 },
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

function buildWith(calls: string[], overrides: Record<string, unknown>) {
  const server = new McpServer({ name: "t", version: "1" });
  const handlers: Record<string, (a: any) => Promise<any>> = {};
  const orig = server.registerTool.bind(server);
  (server as any).registerTool = (n: string, cfg: any, h: any) => { handlers[n] = h; return orig(n, cfg, h); };
  registerTools(server, () => ({ ...fakeClient(calls), ...overrides }) as any);
  return { handlers };
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

  it("prove_task scaffolds, creates, runs, and publishes a proof url + winner when asked", async () => {
    const calls: string[] = [];
    const { handlers } = build(calls);
    const res = await handlers["prove_task"]({ task: "classify tickets", examples: [{ input: "a", output: "b" }], publish: true });
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

  it("prove_task does not publish unless asked, and returns the caveats", async () => {
    const calls: string[] = [];
    const { handlers } = build(calls);
    const out = JSON.parse((await handlers.prove_task({ task: "t", examples: [{ input: "a" }] })).content[0].text);
    expect(calls).not.toContain("createProofLink");
    expect(out.publication).toEqual({ status: "not_requested" });
    expect(out.proof_url).toBeUndefined();
    expect(out.caveats).toEqual({ grading_caveat: "re-run so every item is scored" });
    expect(out.ranked[0].n_scored).toBe(3);
  });

  it("prove_task reports a refused publication with the gate's reason", async () => {
    const calls: string[] = [];
    const { handlers } = buildWith(calls, {
      createProofLink: async () => { throw new ApiError(409, { error: "publish_blocked", message: "This run is not ready to publish.", blockers: [{ field: "grading_caveat" }] }); },
    });
    const out = JSON.parse((await handlers.prove_task({ task: "t", examples: [{ input: "a" }], publish: true })).content[0].text);
    expect(out.publication).toEqual({ status: "refused", reason: "This run is not ready to publish.", blockers: [{ field: "grading_caveat" }] });
    expect(out.proof_url).toBeUndefined();
  });

  it("prove_task reports a refused publication when the server returns no link token", async () => {
    const calls: string[] = [];
    const { handlers } = buildWith(calls, {
      createProofLink: async () => { calls.push("createProofLink"); return {}; },
    });
    const out = JSON.parse((await handlers.prove_task({ task: "t", examples: [{ input: "a" }], publish: true })).content[0].text);
    expect(out.publication).toEqual({ status: "refused", reason: "The server returned no link token." });
    expect(out.proof_url).toBeUndefined();
  });

  it("prove_task publishes when asked", async () => {
    const calls: string[] = [];
    const { handlers } = build(calls);
    const out = JSON.parse((await handlers.prove_task({ task: "t", examples: [{ input: "a" }], publish: true })).content[0].text);
    expect(out.publication).toEqual({ status: "published", proof_url: "https://app.redcrown.ai/proof/ptok" });
    expect(out.proof_url).toBe("https://app.redcrown.ai/proof/ptok");
  });

  it("try_sample returns a public sample proof url with no input", async () => {
    const { handlers } = build([]);
    const res = await handlers["try_sample"]({});
    const out = JSON.parse(res.content[0].text);
    expect(out.sample).toBe(true);
    expect(out.proof_url).toContain("/proof/");
    expect(out.winner.label).toBe("Sample Winner");
  });

  it("try_sample describes a stored example, not a new run", () => {
    const server = new McpServer({ name: "t", version: "1" });
    const cfgs: Record<string, any> = {};
    const orig = server.registerTool.bind(server);
    (server as any).registerTool = (n: string, cfg: any, h: any) => { cfgs[n] = cfg; return orig(n, cfg, h); };
    registerTools(server, () => fakeClient([]) as any);
    expect(cfgs.try_sample.description).toMatch(/stored/i);
    expect(cfgs.try_sample.description).not.toMatch(/run a benchmark/i);
  });
  // ---- metric confirmation before the spend ----

  const AMBIGUOUS = {
    name: "s", quality_metric: "similarity", quality_bar: 0.8, metric_choice_note: "",
    metric_confirmation: { needed: true, reason: "judge_unreachable" },
    metric_options: [
      { metric: "similarity", eligible: true, reason: null },
      { metric: "exact_match", eligible: false, reason: "references_not_labels" },
      { metric: "judge", eligible: false, reason: "judge_needs_openai" },
    ],
  };
  const EXAMPLES = [{ input: "Why is the sky blue?", output: "Sunlight scatters, and blue scatters the most." }];

  it("prove_task stops before the spend when the scoring method needs confirmation", async () => {
    const calls: string[] = [];
    const { handlers } = buildWith(calls, {
      scaffoldExperiment: async () => { calls.push("scaffoldExperiment"); return AMBIGUOUS; },
    });
    const out = JSON.parse((await handlers.prove_task({ task: "t", examples: EXAMPLES })).content[0].text);
    expect(calls).toEqual(["scaffoldExperiment"]);
    expect(out.status).toBe("needs_confirmation");
    expect(out.proposed_metric).toBe("similarity");
    expect(out.reason).toBe("judge_unreachable");
    expect(out.reason_text).toBe("A judge model needs a connected OpenAI key. Without one, RedCrown compares the text.");
    expect(out.metric_options).toEqual([
      { metric: "similarity", eligible: true, reason: null, reason_text: null },
      { metric: "exact_match", eligible: false, reason: "references_not_labels", reason_text: "Your answers are not short labels." },
      { metric: "judge", eligible: false, reason: "judge_needs_openai", reason_text: "Connect an OpenAI key in the RedCrown app (Models & keys) to use a judge." },
    ]);
    expect(out.next_step).toMatch(/quality_metric/);
    expect(out.next_step).toMatch(/Nothing ran/);
  });

  it("prove_task with quality_metric sends the choice, then runs a spec without the two scaffold keys", async () => {
    const calls: string[] = [];
    let scaffoldBody: any; let created: any;
    const { handlers } = buildWith(calls, {
      scaffoldExperiment: async (b: any) => {
        calls.push("scaffoldExperiment"); scaffoldBody = b;
        return { ...AMBIGUOUS, metric_choice_note: "The owner chose similarity. RedCrown recommended similarity.",
                 metric_confirmation: { needed: false, reason: null } };
      },
      createExperiment: async (b: any) => { calls.push("createExperiment"); created = b; return { id: "e1" }; },
    });
    const out = JSON.parse((await handlers.prove_task({ task: "t", examples: EXAMPLES, quality_metric: "similarity" })).content[0].text);
    expect(scaffoldBody.quality_metric).toBe("similarity");
    expect(calls).toContain("createExperiment");
    expect(created.metric_options).toBeUndefined();
    expect(created.metric_confirmation).toBeUndefined();
    expect(created.quality_metric).toBe("similarity");
    expect(out.quality_metric).toBe("similarity");
    expect(out.status).toBeUndefined();
  });

  it("prove_task without a choice does not send quality_metric", async () => {
    const calls: string[] = [];
    let scaffoldBody: any;
    const { handlers } = buildWith(calls, {
      scaffoldExperiment: async (b: any) => { calls.push("scaffoldExperiment"); scaffoldBody = b; return { name: "s", quality_metric: "wer", quality_bar: 0.8 }; },
    });
    await handlers.prove_task({ task: "t", examples: EXAMPLES });
    expect("quality_metric" in scaffoldBody).toBe(false);
    expect(calls).toContain("createExperiment");
  });

  it("prove_task reports an ineligible choice and spends nothing", async () => {
    const calls: string[] = [];
    const { handlers } = buildWith(calls, {
      scaffoldExperiment: async () => {
        calls.push("scaffoldExperiment");
        throw new ApiError(422, { message: "Your answers are not short labels.", error: "metric_not_eligible", reason: "references_not_labels" });
      },
    });
    const out = JSON.parse((await handlers.prove_task({ task: "t", examples: EXAMPLES, quality_metric: "exact_match" })).content[0].text);
    expect(calls).toEqual(["scaffoldExperiment"]);
    expect(out).toEqual({
      status: "metric_not_eligible", quality_metric: "exact_match", reason: "references_not_labels",
      message: "Your answers are not short labels.",
      next_step: "Call prove_task without quality_metric to see the eligible methods. Nothing ran and nothing was billed.",
    });
  });

  it("prove_task shows the scaffold's own note for a scaffolder_note confirmation", async () => {
    const calls: string[] = [];
    const note = "The reference cannot match an answer exactly, so the metric is similarity.";
    const { handlers } = buildWith(calls, {
      scaffoldExperiment: async () => {
        calls.push("scaffoldExperiment");
        return { ...AMBIGUOUS, metric_choice_note: note, metric_confirmation: { needed: true, reason: "scaffolder_note" } };
      },
    });
    const out = JSON.parse((await handlers.prove_task({ task: "t", examples: EXAMPLES })).content[0].text);
    expect(calls).toEqual(["scaffoldExperiment"]);
    expect(out.reason_text).toBe(note);
  });

  it("prove_task rethrows a scaffold 422 that is not a metric refusal", async () => {
    const calls: string[] = [];
    const { handlers } = buildWith(calls, {
      scaffoldExperiment: async () => { calls.push("scaffoldExperiment"); throw new ApiError(422, "dataset rows are invalid"); },
    });
    await expect(handlers.prove_task({ task: "t", examples: EXAMPLES, quality_metric: "similarity" })).rejects.toThrow("dataset rows are invalid");
    expect(calls).toEqual(["scaffoldExperiment"]);
  });

  it("prove_task and scaffold_experiment accept quality_metric in their input schemas", () => {
    const server = new McpServer({ name: "t", version: "1" });
    const cfgs: Record<string, any> = {};
    const orig = server.registerTool.bind(server);
    (server as any).registerTool = (n: string, cfg: any, h: any) => { cfgs[n] = cfg; return orig(n, cfg, h); };
    registerTools(server, () => fakeClient([]) as any);
    for (const name of ["prove_task", "scaffold_experiment"]) {
      const field = cfgs[name].inputSchema.quality_metric;
      expect(field, name).toBeDefined();
      expect(field.safeParse(undefined).success, name).toBe(true);
      expect(field.safeParse("similarity").success, name).toBe(true);
    }
    expect(cfgs.prove_task.description).toMatch(/confirm/i);
  });
});
