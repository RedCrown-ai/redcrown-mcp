# redcrown-mcp

`redcrown-mcp` is the RedCrown MCP server. It exposes the RedCrown "prove" loop (run your inputs across models and configs, and get a ranked cost/quality/latency report) as MCP tools, so you can drive it headlessly from Claude. You authenticate with your RedCrown account via OAuth. The server is a stateless shim: it validates your access token and forwards it to the RedCrown REST API, so it holds no secrets and all data stays scoped to your account.

## Tools

| Tool | Description |
|---|---|
| `list_models` | List available providers and models, including free no-key models. |
| `create_experiment` | Create a new experiment from a definition (name, pipeline, candidates, dataset). |
| `run_experiment` | Queue a run for an experiment. Returns a run ID. |
| `get_report` / `get_run` | Fetch the ranked cost/quality/latency report by run ID. |
| `list_experiments` | List all experiments belonging to your account. |
| `simulate_cost` | Get a projected cost estimate (hosted API and self-hosted per cloud) for a model and token counts. |

## Add to Claude

1. In Claude (Desktop, Claude Code, or claude.ai), open the MCP connectors settings and add a custom connector.
2. Enter the hosted server URL. (The canonical URL is `https://mcp.redcrown.ai` once deployed.)
3. On connect, Claude runs the OAuth flow. Log in with your RedCrown account.
4. The seven tools listed above are then available in your Claude session.

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
