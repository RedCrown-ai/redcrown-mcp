import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { registerTools } from "./tools.js";
import { RedcrownClient } from "./restClient.js";
import { loadConfig } from "./config.js";

const cfg = loadConfig();

export const INSTRUCTIONS =
  "RedCrown checks a changed AI feature for regressions against a reference run and your written requirements, " +
  "and keeps the evidence for each case. To record results you already have, call import_results " +
  "with an aggregate payload or a `redcrown harness export` payload (per-check evidence). To run " +
  "several models on a few examples and rank them, call prove_task; it publishes a share link only " +
  "when you pass publish: true. get_run and get_report read a stored run with its caveats. " +
  "The offline commands redcrown score and redcrown check are CLI only; an agent with a shell " +
  "should run them directly. try_sample returns a stored example report.";

export function buildServer(token: string): McpServer {
  const server = new McpServer(
    { name: "redcrown-mcp", version: "0.1.0" },
    { instructions: INSTRUCTIONS },
  );
  registerTools(server, () => new RedcrownClient(cfg.apiUrl, token));
  return server;
}

export async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const token = (req as Request & { token?: string }).token;
  if (!token) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  const server = buildServer(token);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
