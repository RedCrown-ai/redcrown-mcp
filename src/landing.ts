// A human-readable landing page served at GET / so a browser visitor
// understands what this endpoint is. The MCP protocol itself lives at POST /mcp.

export function landingPage(resourceUrl: string): string {
  const site = "https://redcrown.ai";
  const repo = "https://github.com/RedCrown-ai/redcrown-mcp";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RedCrown MCP Server</title>
<meta name="description" content="The RedCrown prove-loop as MCP tools. Run your inputs across every model and get a ranked cost, quality, and latency report, driven headlessly from Claude and other agents.">
<style>
  :root{
    --navy:#0e2c56; --red:#e52321; --yellow:#ffc629; --blue:#36b9e9; --green:#29b34b;
    --ink:#0e2c56; --body:#33455c; --muted:#6b7a8d; --line:#e2e7ee;
    --bg:#f6f7f9; --card:#ffffff; --code-bg:#0e2c56; --code-ink:#eaf1fb;
  }
  @media (prefers-color-scheme: dark){
    :root{ --ink:#eaf1fb; --body:#c3d1e3; --muted:#8ea3bf; --line:#20406a;
      --bg:#0a1a30; --card:#10294a; --code-bg:#071426; --code-ink:#d8e6fb; }
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--body);
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    line-height:1.6;-webkit-font-smoothing:antialiased}
  .wrap{max-width:760px;margin:0 auto;padding:0 22px}
  a{color:var(--blue)}
  code,pre{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
  header{padding:52px 0 30px}
  .mark{display:flex;gap:4px;margin-bottom:20px}
  .mark span{width:13px;height:26px;border-radius:2px;display:block}
  .eyebrow{font-family:ui-monospace,monospace;text-transform:uppercase;letter-spacing:.16em;
    font-size:.72rem;font-weight:600;color:var(--muted)}
  h1{color:var(--ink);font-size:clamp(1.9rem,5vw,2.7rem);line-height:1.08;
    letter-spacing:-.02em;margin:.35em 0 .3em;font-weight:800;text-wrap:balance}
  .lede{font-size:1.1rem;max-width:60ch}
  h2{color:var(--ink);font-size:1.25rem;letter-spacing:-.01em;margin:44px 0 12px;font-weight:750}
  .callout{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--yellow);
    border-radius:10px;padding:16px 18px;margin-top:26px;font-size:.97rem}
  .callout b{color:var(--ink)}
  .endpoint{font-family:ui-monospace,monospace;background:var(--code-bg);color:var(--code-ink);
    padding:2px 8px;border-radius:6px;font-size:.9em;white-space:nowrap}
  .tools{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
  .tool{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px 18px}
  .tool h3{margin:0 0 4px;color:var(--ink);font-size:1rem}
  .tool h3 code{color:var(--red);font-weight:700;font-size:.95em}
  .tool p{margin:0;font-size:.9rem;color:var(--body)}
  pre{background:var(--code-bg);color:var(--code-ink);border-radius:10px;padding:15px 17px;
    overflow-x:auto;font-size:.86rem;line-height:1.5;margin:12px 0}
  ul.conn{list-style:none;padding:0;margin:0}
  ul.conn li{padding:14px 0;border-bottom:1px solid var(--line)}
  ul.conn li:last-child{border-bottom:none}
  ul.conn b{color:var(--ink)}
  .links{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
  .links a{display:inline-block;background:var(--card);border:1px solid var(--line);
    border-radius:999px;padding:8px 16px;text-decoration:none;color:var(--ink);font-weight:600;font-size:.9rem}
  .links a:hover{border-color:var(--blue)}
  footer{border-top:1px solid var(--line);margin-top:48px;padding:26px 0 60px;color:var(--muted);font-size:.85rem}
  @media (max-width:560px){ .tools{grid-template-columns:1fr} }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="mark" aria-hidden="true">
      <span style="background:#0e2c56"></span><span style="background:#e52321"></span>
      <span style="background:#ffc629"></span><span style="background:#36b9e9"></span>
      <span style="background:#29b34b"></span>
    </div>
    <div class="eyebrow">RedCrown &middot; MCP Server</div>
    <h1>The RedCrown prove-loop, as tools for your agent.</h1>
    <p class="lede">Run your inputs across every model and config, and get back the cheapest one that
    clears your quality bar, with a shareable proof. This endpoint exposes that loop to Claude and other
    agents over the Model Context Protocol.</p>
  </header>

  <div class="callout">
    <b>This is a machine endpoint, not a web app.</b> Agents connect to it over MCP; the protocol lives at
    <span class="endpoint">POST ${resourceUrl}/mcp</span> and requires an OAuth login with your RedCrown account.
    The server is a stateless shim: it validates your token and forwards it to the RedCrown API, so it holds no
    secrets and all data stays scoped to your account. Looking for the product? Visit <a href="${site}">redcrown.ai</a>.
  </div>

  <h2>The two tools most callers need</h2>
  <div class="tools">
    <div class="tool">
      <h3><code>prove_task</code></h3>
      <p>One call. A plain-language task plus a few examples, and RedCrown runs every model and returns the
      cheapest that clears your bar, with a shareable proof link. Leave the expected output blank to rank against the model you use now.</p>
    </div>
    <div class="tool">
      <h3><code>try_sample</code></h3>
      <p>A zero-input demo on a public dataset. Returns a shareable proof link with no keys and no setup.</p>
    </div>
  </div>
  <p style="margin-top:12px;font-size:.9rem;color:var(--muted)">Fifteen more advanced tools drive the full loop
  (import results, scaffold and run experiments, live proxy capture, and the reviewer decision report).</p>

  <h2>Connect your agent</h2>
  <ul class="conn">
    <li><b>Claude (Desktop / claude.ai):</b> open connector settings, add a custom connector, enter
      <span class="endpoint">${resourceUrl}</span>, and approve the OAuth login.</li>
    <li><b>Claude Code:</b>
      <pre>claude mcp add --transport http redcrown ${resourceUrl}</pre></li>
    <li><b>Cursor, Codex, and other mcp.json clients:</b>
      <pre>{
  "mcpServers": {
    "redcrown": { "type": "http", "url": "${resourceUrl}" }
  }
}</pre></li>
  </ul>
  <p style="font-size:.92rem">Once connected, try: <em>"Use RedCrown to prove the cheapest model for
  classifying these support tickets."</em> The agent calls <code>prove_task</code> and returns a proof link.</p>

  <div class="links">
    <a href="${site}">redcrown.ai</a>
    <a href="${repo}">Source on GitHub</a>
    <a href="${resourceUrl}/.well-known/oauth-protected-resource">OAuth metadata</a>
  </div>

  <footer>
    &copy; RedCrown.ai &middot; Stateless MCP shim, holds no secrets. Protocol endpoint: <span class="endpoint">POST /mcp</span>.
  </footer>
</div>
</body>
</html>`;
}
