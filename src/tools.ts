import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RedcrownClient } from "./restClient.js";

type ClientFor = () => RedcrownClient;
const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export function registerTools(server: McpServer, clientFor: ClientFor): void {
  server.registerTool("list_models",
    { description: "List available providers and models, including free no-key models.", inputSchema: {} },
    async () => ok(await clientFor().listModels()));

  server.registerTool("list_experiments",
    { description: "List the caller's experiments.", inputSchema: {} },
    async () => ok(await clientFor().listExperiments()));

  server.registerTool("get_run",
    { description: "Get an experiment run and its ranked report by run id.",
      inputSchema: { run_id: z.string() } },
    async ({ run_id }) => ok(await clientFor().getRun(run_id)));

  server.registerTool("get_report",
    { description: "Alias of get_run: fetch the ranked proof report for a run id.",
      inputSchema: { run_id: z.string() } },
    async ({ run_id }) => ok(await clientFor().getRun(run_id)));

  server.registerTool("create_experiment",
    { description: "Create an experiment. Pass the full experiment definition (name, objective, quality_metric, quality_bar, reference_source, allowed_providers, pipeline, dataset).",
      inputSchema: { experiment: z.record(z.string(), z.any()) } },
    async ({ experiment }) => ok(await clientFor().createExperiment(experiment)));

  server.registerTool("run_experiment",
    { description: "Queue a run of an experiment by id; returns the run id to poll with get_report.",
      inputSchema: { experiment_id: z.string() } },
    async ({ experiment_id }) => ok(await clientFor().runExperiment(experiment_id)));

  server.registerTool("simulate_cost",
    { description: "Estimate projected hosted-API and self-hosted (per cloud) cost for a model and token counts.",
      inputSchema: { model: z.string(), prompt_tokens: z.number().int().nonnegative(),
        completion_tokens: z.number().int().nonnegative() } },
    async ({ model, prompt_tokens, completion_tokens }) =>
      ok(await clientFor().costEstimate(model, prompt_tokens, completion_tokens)));

  server.registerTool("scaffold_experiment",
    { description: "Turn a plain-language task description into a valid experiment spec ready to pass to create_experiment. Returns name, objective, quality_metric, quality_bar, pipeline, dataset, and more.",
      inputSchema: {
        task: z.string(),
        task_kind: z.string().optional(),
        incumbent: z.string().optional(),
        candidates: z.array(z.string()).optional(),
        quality_bar: z.number().optional(),
        dataset: z.array(z.record(z.string(), z.any())).optional(),
      } },
    async (args) => ok(await clientFor().scaffoldExperiment(args)));

  server.registerTool("setup_proxy",
    { description: "Create a proxied endpoint that captures live traffic for shadow evaluation. Returns the endpoint key and forward URL.",
      inputSchema: {
        target_url: z.string(),
        experiment_id: z.string().optional(),
        sampling_rate: z.number().optional(),
        daily_budget_usd: z.number().optional(),
      } },
    async ({ target_url, experiment_id, sampling_rate, daily_budget_usd }) => {
      const endpoint_key = "mcp-" + Math.random().toString(36).slice(2, 10);
      return ok(await clientFor().createProxiedEndpoint({
        endpoint_key,
        target_url,
        experiment_id,
        forward_headers: {},
        sampling_rate,
        daily_budget_usd,
      }));
    });

  server.registerTool("list_proxies",
    { description: "List all proxied endpoints for the caller's workspace.",
      inputSchema: {} },
    async () => ok(await clientFor().listProxiedEndpoints()));

  server.registerTool("replay_captures",
    { description: "Replay captured traffic through the shadow eval engine for a proxied endpoint.",
      inputSchema: { endpoint_id: z.string() } },
    async ({ endpoint_id }) => ok(await clientFor().replayCaptures(endpoint_id)));

  server.registerTool("create_review",
    { description: "Create a human-review session for a proxied endpoint's captures.",
      inputSchema: {
        endpoint_id: z.string(),
        name: z.string().optional(),
      } },
    async ({ endpoint_id, name }) => ok(await clientFor().createReviewSession({ endpoint_id, name })));

  server.registerTool("invite_reviewer",
    { description: "Invite a reviewer to a review session. Returns a one-time token; the reviewer link is https://app.redcrown.ai/review/<token>.",
      inputSchema: {
        session_id: z.string(),
        reviewer_label: z.string(),
      } },
    async ({ session_id, reviewer_label }) =>
      ok(await clientFor().addReviewer(session_id, { reviewer_label })));

  server.registerTool("get_review_examples",
    { description: "Get the candidate outputs for a captured request, ready for human review.",
      inputSchema: { capture_id: z.string() } },
    async ({ capture_id }) => ok(await clientFor().getReviewExamples(capture_id)));

  server.registerTool("get_decision_report",
    { description: "Get the aggregated decision report for a review session, including reviewer verdicts and the recommended winner.",
      inputSchema: { session_id: z.string() } },
    async ({ session_id }) => ok(await clientFor().getDecisionReport(session_id)));
}
