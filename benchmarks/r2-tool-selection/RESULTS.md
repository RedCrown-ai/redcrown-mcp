# Internal description experiment: September 15, 2026

Frozen source: `6ee80d17be194ba3c5c22c6839c9bf0ae9c4d7d2`.
Model: `deepseek/deepseek-v4-flash`, through OpenRouter, low reasoning effort,
2,048 output-token limit. All three versions used the same 16 cases and decoding
configuration. No tools were executed and no responses were repaired or retried.

| Version | Correct | Coverage | Gate against previous version |
| --- | ---: | --- | --- |
| Original descriptions | 16/16 | Complete | Baseline |
| Supplied-results versus fresh-execution wording | 16/16 | Complete | Pass |
| Draft/save/execute wording, including preceding change | 16/16 | Complete | Pass |

The final version also passes against the original baseline. All quality means
are 1.0 and all paired mean deltas are zero. The predeclared requirement was
complete coverage, all 16 correct, and no regression. These easy, explicit,
developer-authored requests demonstrate a basic compatibility check, not an
accuracy improvement, full agent reliability, or customer adoption.

The description changes are reasonable for clarity, with no observed regression
on this set. They remain a reviewable proposal; this experiment does not deploy
the MCP service, accept a hosted baseline, or establish that a user trusted the
handoff. No task-selection cases were removed after generation.

Fresh outputs were captured by the bounded external harness at
`RedCrown-ai/redcrown` commit `fc76ea0`; the released `redcrown==0.1.19` CLI scored
them and ran the JSON policies with network access blocked. Evidence origin is
supplied outputs, rescored; configuration assurance is declared. CLI/Python
versions were 0.1.19 / 3.14.5. Raw receipts and evidence are retained privately.

Preflight reservation: $0.034406. OpenRouter reported $0.0016415336 across all
48 completions, with complete reported-cost coverage. This is provider-reported
spend, not an R2 comparable cost gate or a guaranteed future price.
