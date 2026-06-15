# redcrown-mcp

`redcrown-mcp` is the RedCrown MCP server. It exposes the RedCrown "prove" loop (run your inputs across models and configs, and get a ranked cost/quality/latency report) as MCP tools, so you can drive it headlessly from Claude. You authenticate with your RedCrown account via OAuth. The server is a stateless shim: it validates your access token and forwards it to the RedCrown REST API, so it holds no secrets and all data stays scoped to your account.

## Start here

Most callers need one tool:

| Tool | Description |
|---|---|
| `prove_task` | **One call.** A plain-language task + a few examples (`{input, output?}`) → RedCrown scaffolds, runs every model, and returns the cheapest one that clears your quality bar, with a shareable `proof_url`. Leave `output` blank to rank against the model you use now. |
| `try_sample` | Zero-input demo on a public dataset → a shareable `proof_url`, no keys, no setup. |

Example: `prove_task({ task: "classify support tickets", examples: [{ input: "My invoice charged me twice", output: "billing" }, { input: "the app crashes on settings", output: "bug" }] })`.

## Tools

Beyond the two core tools above, the full prove loop is exposed as `[advanced]` tools — granular control of an existing run. You rarely need them directly.

**Offline eval (Mode A) — `[advanced]`**

| Tool | Description |
|---|---|
| `import_results` | Upload an eval run from any harness (or the `redcrown` CLI) as a ranked, shareable run. (Core: surfaced first.) |
| `get_report` / `get_run` | Fetch the ranked cost/quality/latency report by run ID. |
| `scaffold_experiment` | Turn a plain-language task into a valid experiment spec ready for `create_experiment`. (`prove_task` does this for you.) |
| `create_experiment` | Create an experiment from a full definition (name, pipeline, candidates, dataset). |
| `run_experiment` | Queue a run for an experiment. Returns a run ID. |
| `list_experiments` | List all experiments belonging to your account. |
| `list_models` | List available providers and models, including free no-key models. |
| `simulate_cost` | Projected cost (hosted API and self-hosted per cloud) for a model and token counts. |

**Live proxy + capture (Mode B) — `[advanced]`**

| Tool | Description |
|---|---|
| `setup_proxy` | Create a proxied endpoint that captures live traffic for shadow evaluation. Returns the endpoint key and forward URL. |
| `list_proxies` | List all proxied endpoints for your workspace. |
| `replay_captures` | Replay captured traffic through the shadow eval engine for a proxied endpoint. |

**Reviewer validation + decision**

| Tool | Description |
|---|---|
| `create_review` | Create a human-review session for a proxied endpoint's captures. |
| `invite_reviewer` | Invite a reviewer to a session. Returns a one-time `app.redcrown.ai/review/<token>` link. |
| `get_review_examples` | Get the candidate outputs for a captured request, ready for human review. |
| `get_decision_report` | Get the aggregated decision report for a session, including reviewer verdicts and the recommended winner. |

## Connect your agent

The hosted server is at **`https://mcp.redcrown.ai`**. On connect, your client runs the OAuth flow and you log in with your RedCrown account; the server holds no secrets. Then ask your agent to **`prove_task`** (or `try_sample`).

**Claude (Desktop / claude.ai):** open MCP connector settings, add a custom connector, enter `https://mcp.redcrown.ai`, and approve the OAuth login.

**Claude Code:**

```bash
claude mcp add --transport http redcrown https://mcp.redcrown.ai
```

**Cursor / Codex (and other `mcp.json`-style clients):**

```json
{
  "mcpServers": {
    "redcrown": {
      "type": "http",
      "url": "https://mcp.redcrown.ai"
    }
  }
}
```

Once connected, try: *"Use RedCrown to prove the cheapest model for classifying these support tickets"* — the agent calls `prove_task` and returns a shareable proof link.

## Environment variables

The server reads these variables at startup. All four are required in production.

| Variable | Description |
|---|---|
| `REDCROWN_API_URL` | The RedCrown backend base URL, e.g. `https://redcrown-api-production.up.railway.app`. |
| `REDCROWN_AS_ISSUER` | The OAuth Authorization Server issuer. Set this to the same backend URL. |
| `REDCROWN_AS_JWKS_URL` | The JWKS endpoint on the backend, e.g. `https://redcrown-api-production.up.railway.app/oauth/jwks`. |
| `REDCROWN_RESOURCE_URL` | This server's own public URL. **Must equal `https://mcp.redcrown.ai`** (or whatever value the backend was configured with as the access-token audience). The server verifies the `aud` claim on every token; a mismatch rejects the request. |
| `PORT` | HTTP port to listen on. Default: `8080`. |

## Self-host / run locally

**Node.js**

```bash
npm ci
npm run build

REDCROWN_API_URL=https://redcrown-api-production.up.railway.app \
REDCROWN_AS_ISSUER=https://redcrown-api-production.up.railway.app \
REDCROWN_AS_JWKS_URL=https://redcrown-api-production.up.railway.app/oauth/jwks \
REDCROWN_RESOURCE_URL=https://mcp.redcrown.ai \
node dist/index.js
```

For development with live reload:

```bash
npm run dev
```

**Docker**

```bash
docker build -t redcrown-mcp .

docker run -p 8080:8080 \
  -e REDCROWN_API_URL=https://redcrown-api-production.up.railway.app \
  -e REDCROWN_AS_ISSUER=https://redcrown-api-production.up.railway.app \
  -e REDCROWN_AS_JWKS_URL=https://redcrown-api-production.up.railway.app/oauth/jwks \
  -e REDCROWN_RESOURCE_URL=https://mcp.redcrown.ai \
  redcrown-mcp
```

## How it works

The server is a stateless shim. On each request it validates the caller's RedCrown access token (RS256, verified against the AS JWKS, audience-bound to `REDCROWN_RESOURCE_URL`) and forwards the bearer token to the RedCrown REST API. The server holds no secrets and all data stays scoped to the authenticated account.

## License

MIT. See [LICENSE](LICENSE).
