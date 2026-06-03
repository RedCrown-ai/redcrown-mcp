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
}
