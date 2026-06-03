import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { registerTools } from "./tools.js";
import { RedcrownClient } from "./restClient.js";
import { loadConfig } from "./config.js";

const cfg = loadConfig();

export function buildServer(token: string): McpServer {
  const server = new McpServer({ name: "redcrown-mcp", version: "0.1.0" });
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
