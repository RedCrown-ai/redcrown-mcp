import express from "express";
import { handleMcpRequest } from "./server.js";
import { requireBearer, protectedResourceMetadata } from "./auth.js";
import { loadConfig } from "./config.js";
import { landingPage } from "./landing.js";

const cfg = loadConfig();
export const app = express();
app.use(express.json({ limit: "5mb" }));

app.get("/", (_req, res) => {
  res.type("html").send(landingPage(cfg.resourceUrl));
});

app.get("/.well-known/oauth-protected-resource", (_req, res) => {
  res.json(protectedResourceMetadata(cfg.resourceUrl, cfg.issuer));
});

app.post("/mcp",
  requireBearer({ issuer: cfg.issuer, jwksUrl: cfg.jwksUrl, resourceUrl: cfg.resourceUrl }),
  handleMcpRequest);
