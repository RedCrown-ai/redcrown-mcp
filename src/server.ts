import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";

export function buildServer(): McpServer {
  const server = new McpServer({ name: "redcrown-mcp", version: "0.1.0" });
  server.registerTool(
    "ping",
    { description: "Health check", inputSchema: {} },
    async () => ({ content: [{ type: "text", text: "pong" }] }),
  );
  return server;
}

export async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}
