import express from "express";
import { handleMcpRequest } from "./server.js";

export const app = express();
app.use(express.json());
app.post("/mcp", handleMcpRequest);
