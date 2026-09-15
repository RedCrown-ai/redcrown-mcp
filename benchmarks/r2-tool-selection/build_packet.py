"""Build the frozen, non-executing tool-name selection task for the R2 harness."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent


def build():
    cases_path = ROOT / "cases.json"
    cases = json.loads(cases_path.read_text())["cases"]
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    variants = []
    for stem in ["baseline", "candidate-01-supplied-vs-fresh", "candidate-02-lifecycle"]:
        context = json.loads((ROOT / (stem + ".json")).read_text())
        prompt = context["system_prompt"] + "\n\nAvailable tools:\n" + json.dumps(
            context["tools"], ensure_ascii=False, separators=(",", ":")
        )
        variants.append({"id": stem, "configuration": {
            "provider": "openrouter", "model": "deepseek/deepseek-v4-flash",
            "prompt": prompt, "system_prompt": None,
            "params": {"max_tokens": 2048, "reasoning": {"effort": "low"}},
            "source_revision": commit, "endpoint_revision": None,
        }})
    return {
        "experiment_id": "redcrown-mcp-r2-tool-selection-v1",
        "quality_metric": "exact_match", "quality_bar": 1.0,
        "items": [{"item_id": c["id"], "input": c["request"], "reference": c["expected_tool"]} for c in cases],
        "variants": variants,
        "selection": {"cases_sha256": hashlib.sha256(cases_path.read_bytes()).hexdigest(),
                      "rule": "all 16 developer-authored cases, no output-based selection"},
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    with args.output.open("x", encoding="utf-8") as f:
        f.write(json.dumps(build(), indent=2) + "\n")
    print("Frozen MCP selection packet: 16 cases, 3 description versions")
