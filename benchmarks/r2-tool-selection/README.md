# R2 MCP tool-selection validation

This is an internal, developer-authored validation set for choosing among the
RedCrown MCP tools. It does not execute tools, call providers, or demonstrate
customer usage. It is also not a full agent evaluation: it measures only whether
a model returns the expected tool name for a fixed request and tool catalog.

## Variants

The variants are sequential. Each JSON file is a complete prompt context with
all 18 registered tool names and descriptions.

1. `baseline.json` preserves the descriptions from `src/tools.ts` before this
   experiment.
2. `candidate-01-supplied-vs-fresh.json` changes only `prove_task` and
   `import_results`. It makes model execution and supplied-output import
   mutually explicit.
3. `candidate-02-lifecycle.json` retains candidate 1 and changes
   `scaffold_experiment`, `create_experiment`, and `run_experiment`. It states
   which lifecycle step drafts, saves, or executes.

Candidate 2 is the version now represented in `src/tools.ts`. The descriptions
in these files are copied verbatim from their respective source versions.
As a preparation preflight, all 18 candidate-2 names and descriptions were
checked against the registered source catalog and matched exactly.

## Evaluation

`build_packet.py` renders each variant's instruction and compact JSON tool
catalog together in one user prompt, followed by a blank line and the case
request. It deliberately sets the provider system prompt to `null`; the
`system_prompt` field in each context file is therefore an instruction string,
not a separate system-role message. Score the response with exact string
equality against `expected_tool`. The only accepted response is one registered
tool name; do not execute it. Report accuracy and item-level results for all 16
cases. Missing, extra, or malformed responses are failures, not exclusions.

Run the same model and decoding configuration for all three variants. Keep the
case order fixed or apply one recorded permutation to every variant. Do not
claim that RedCrown witnessed generation unless the evaluator actually invokes
the model through a RedCrown-owned generation path.

The predeclared policy in `policy.json` requires all 16 responses to be correct
with complete grading and no regression. Evaluate candidate 1 against the
baseline, candidate 2 against candidate 1, and candidate 2 against the baseline.
A passing result is evidence for review; it does not automatically adopt or
publish either description change.
