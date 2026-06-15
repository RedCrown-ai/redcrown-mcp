import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RedcrownClient } from "./restClient.js";

type ClientFor = () => RedcrownClient;
const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

// The published anonymized clinical-transcription proof, reused as the zero-input
// sample (no keys, no setup). More task-type samples land via a backend /samples.
const SAMPLE_TOKENS: Record<string, string> = {
  transcribe: "O9iYVdWuaYjaL6mnImeIsD6TB1W_S6h4Frbx04YqAYQ",
};

type Cand = {
  label?: string; mean_quality?: number | null; savings_vs_incumbent?: number | null;
  is_winner?: boolean; is_incumbent?: boolean; clears_bar?: boolean;
};
function candidates(report: unknown): Cand[] {
  const per = (report as { per_step?: Record<string, Cand[]> } | null)?.per_step ?? {};
  return Object.values(per).flat();
}
function summarize(report: unknown) {
  const cands = candidates(report);
  const winner = cands.find((c) => c.is_winner) ?? null;
  return {
    winner: winner
      ? { label: winner.label, quality: winner.mean_quality, savings_vs_incumbent: winner.savings_vs_incumbent }
      : null,
    ranked: cands.map((c) => ({
      label: c.label, quality: c.mean_quality, is_winner: !!c.is_winner,
      is_incumbent: !!c.is_incumbent, clears_bar: !!c.clears_bar,
    })),
  };
}

export function registerTools(server: McpServer, clientFor: ClientFor): void {
  // ---- core: start here ----

  server.registerTool("prove_task",
    { description: "Benchmark every model on a task and return the cheapest one that's good enough, with a shareable proof link. Pass a plain-language task and a few examples ({input, output?}); leave the output blank to rank against the model you use now. For a no-input demo, use try_sample.",
      inputSchema: {
        task: z.string(),
        examples: z.array(z.object({ input: z.string(), output: z.string().optional() })).optional(),
        quality_bar: z.number().optional(),
      } },
    async ({ task, examples, quality_bar }) => {
      const client = clientFor();
      const dataset = (examples ?? [])
        .filter((e) => e.input && e.input.trim())
        .map((e, i) => ({
          id: `ex-${i + 1}`,
          payload: { kind: "text", text: e.input.trim() },
          reference: e.output && e.output.trim() ? e.output.trim() : null,
        }));
      if (dataset.length === 0) {
        return ok({ error: "Provide at least one example { input, output? }, or call try_sample for a no-input demo." });
      }
      const spec = (await client.scaffoldExperiment({ task, dataset })) as Record<string, unknown>;
      if (quality_bar !== undefined) spec.quality_bar = quality_bar;
      const created = (await client.createExperiment(spec)) as { id: string };
      let run = (await client.runExperiment(created.id)) as { id: string; status?: string; error?: string; report?: unknown };
      const runId = run.id;
      for (let i = 0; i < 60 && (run.status === "queued" || run.status === "running"); i++) {
        await new Promise((r) => setTimeout(r, 1000));
        run = (await client.getRun(runId)) as typeof run;
      }
      if (run.status !== "complete") {
        return ok({
          status: run.status, run_id: runId, experiment_id: created.id,
          error: run.error ?? "Run did not complete. You may need to connect a model (provider key) for this task — see list_models.",
        });
      }
      let proof_url: string | undefined;
      try {
        const proof = await client.createProofLink(runId, { subject: (spec.name as string) ?? task, scope: null });
        if (proof?.token) proof_url = `https://app.redcrown.ai/proof/${proof.token}`;
      } catch { /* proof link is best-effort */ }
      return ok({ experiment_id: created.id, run_id: runId, proof_url, ...summarize(run.report) });
    });

  server.registerTool("try_sample",
    { description: "Run a benchmark on a public sample dataset and return a shareable proof — no input, no keys, no account. Great for a quick demo. Optional task (default: transcribe).",
      inputSchema: { task: z.string().optional() } },
    async ({ task }) => {
      const key = task && SAMPLE_TOKENS[task] ? task : "transcribe";
      const token = SAMPLE_TOKENS[key];
      const proof = (await clientFor().getProof(token)) as { report?: unknown };
      return ok({ sample: true, task: key, proof_url: `https://app.redcrown.ai/proof/${token}`, ...summarize(proof.report) });
    });

  server.registerTool("import_results",
    { description: "Turn an eval you already ran (in any harness or the redcrown CLI) into a ranked, shareable run. Pass the aggregate results object (name, objective, quality_metric, quality_bar, step, candidates[, references]). Returns the experiment and run ids.",
      inputSchema: { results: z.record(z.string(), z.any()) } },
    async ({ results }) => ok(await clientFor().importResults(results)));

  server.registerTool("get_run",
    { description: "Get an experiment run and its ranked report by run id.",
      inputSchema: { run_id: z.string() } },
    async ({ run_id }) => ok(await clientFor().getRun(run_id)));

  server.registerTool("get_report",
    { description: "Alias of get_run: fetch the ranked proof report for a run id.",
      inputSchema: { run_id: z.string() } },
    async ({ run_id }) => ok(await clientFor().getRun(run_id)));

  // ---- [advanced]: granular control of a run ----

  server.registerTool("list_models",
    { description: "[advanced] List available providers and models, including free no-key models.", inputSchema: {} },
    async () => ok(await clientFor().listModels()));

  server.registerTool("list_experiments",
    { description: "[advanced] List the caller's experiments.", inputSchema: {} },
    async () => ok(await clientFor().listExperiments()));

  server.registerTool("create_experiment",
    { description: "[advanced] Create an experiment from a full definition (name, objective, quality_metric, quality_bar, reference_source, allowed_providers, pipeline, dataset). Most callers should use prove_task instead.",
      inputSchema: { experiment: z.record(z.string(), z.any()) } },
    async ({ experiment }) => ok(await clientFor().createExperiment(experiment)));

  server.registerTool("run_experiment",
    { description: "[advanced] Queue a run of an experiment by id; returns the run id to poll with get_report.",
      inputSchema: { experiment_id: z.string() } },
    async ({ experiment_id }) => ok(await clientFor().runExperiment(experiment_id)));

  server.registerTool("scaffold_experiment",
    { description: "[advanced] Turn a plain-language task into a valid experiment spec ready for create_experiment. (prove_task does this for you.)",
      inputSchema: {
        task: z.string(),
        task_kind: z.string().optional(),
        incumbent: z.string().optional(),
        candidates: z.array(z.string()).optional(),
        quality_bar: z.number().optional(),
        dataset: z.array(z.record(z.string(), z.any())).optional(),
      } },
    async (args) => ok(await clientFor().scaffoldExperiment(args)));

  server.registerTool("simulate_cost",
    { description: "[advanced] Estimate projected hosted-API and self-hosted (per cloud) cost for a model and token counts.",
      inputSchema: { model: z.string(), prompt_tokens: z.number().int().nonnegative(),
        completion_tokens: z.number().int().nonnegative() } },
    async ({ model, prompt_tokens, completion_tokens }) =>
      ok(await clientFor().costEstimate(model, prompt_tokens, completion_tokens)));

  server.registerTool("setup_proxy",
    { description: "[advanced] Create a proxied endpoint that captures live traffic for shadow evaluation. Returns the endpoint key and forward URL.",
      inputSchema: {
        target_url: z.string(),
        experiment_id: z.string().optional(),
        sampling_rate: z.number().optional(),
        daily_budget_usd: z.number().optional(),
      } },
    async ({ target_url, experiment_id, sampling_rate, daily_budget_usd }) => {
      const endpoint_key = "mcp-" + Math.random().toString(36).slice(2, 10);
      return ok(await clientFor().createProxiedEndpoint({
        endpoint_key, target_url, experiment_id, forward_headers: {}, sampling_rate, daily_budget_usd,
      }));
    });

  server.registerTool("list_proxies",
    { description: "[advanced] List all proxied endpoints for the caller's workspace.", inputSchema: {} },
    async () => ok(await clientFor().listProxiedEndpoints()));

  server.registerTool("replay_captures",
    { description: "[advanced] Replay captured traffic through the shadow eval engine for a proxied endpoint.",
      inputSchema: { endpoint_id: z.string() } },
    async ({ endpoint_id }) => ok(await clientFor().replayCaptures(endpoint_id)));

  server.registerTool("create_review",
    { description: "[advanced] Create a human-review session for a proxied endpoint's captures.",
      inputSchema: { endpoint_id: z.string(), name: z.string().optional() } },
    async ({ endpoint_id, name }) => ok(await clientFor().createReviewSession({ endpoint_id, name })));

  server.registerTool("invite_reviewer",
    { description: "[advanced] Invite a reviewer to a review session. Returns a one-time token; the link is https://app.redcrown.ai/review/<token>.",
      inputSchema: { session_id: z.string(), reviewer_label: z.string() } },
    async ({ session_id, reviewer_label }) =>
      ok(await clientFor().addReviewer(session_id, { reviewer_label })));

  server.registerTool("get_review_examples",
    { description: "[advanced] Get the candidate outputs for a captured request, ready for human review.",
      inputSchema: { capture_id: z.string() } },
    async ({ capture_id }) => ok(await clientFor().getReviewExamples(capture_id)));

  server.registerTool("get_decision_report",
    { description: "[advanced] Get the aggregated decision report for a review session, including reviewer verdicts and the recommended winner.",
      inputSchema: { session_id: z.string() } },
    async ({ session_id }) => ok(await clientFor().getDecisionReport(session_id)));
}
