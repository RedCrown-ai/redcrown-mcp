export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    const text =
      detail && typeof detail === "object" && typeof (detail as { message?: unknown }).message === "string"
        ? (detail as { message: string }).message
        : typeof detail === "string" ? detail : `HTTP ${status}`;
    super(text);
    this.name = "ApiError";
  }
}

export class RedcrownClient {
  constructor(private baseUrl: string, private token: string) {}

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    if (!resp.ok) {
      let detail: unknown = undefined;
      try { detail = (await resp.json() as { detail?: unknown }).detail; } catch { /* no JSON body */ }
      throw new ApiError(resp.status, detail);
    }
    if (resp.status === 204) return undefined as T;
    return resp.json() as Promise<T>;
  }

  listModels() { return this.req<{ providers: string[]; presets: unknown[]; free_presets: unknown[] }>("/providers"); }
  listExperiments() { return this.req<{ experiments: unknown[] }>("/experiments"); }
  getRun(id: string) { return this.req<unknown>(`/exp-runs/${id}`); }
  createExperiment(body: unknown) { return this.req<unknown>("/experiments", { method: "POST", body: JSON.stringify(body) }); }
  runExperiment(id: string) { return this.req<unknown>(`/experiments/${id}/runs`, { method: "POST" }); }
  costEstimate(model: string, promptTokens: number, completionTokens: number) {
    const q = new URLSearchParams({ model, prompt_tokens: String(promptTokens), completion_tokens: String(completionTokens) });
    return this.req<unknown>(`/cost-estimate?${q.toString()}`);
  }

  createProofLink(runId: string, body: unknown) { return this.req<{ token?: string }>(`/exp-runs/${runId}/proof-link`, { method: "POST", body: JSON.stringify(body) }); }
  getProof(token: string) { return this.req<unknown>(`/proof/${token}`); }

  // Full prove-loop methods
  scaffoldExperiment(body: unknown) { return this.req<unknown>("/experiments/scaffold", { method: "POST", body: JSON.stringify(body) }); }
  importResults(body: unknown) { return this.req<{ experiment_id: string; run_id: string }>("/experiments/import", { method: "POST", body: JSON.stringify(body) }); }
  createProxiedEndpoint(body: unknown) { return this.req<unknown>("/proxied-endpoints", { method: "POST", body: JSON.stringify(body) }); }
  listProxiedEndpoints() { return this.req<unknown>("/proxied-endpoints"); }
  replayCaptures(id: string) { return this.req<unknown>(`/proxied-endpoints/${id}/replay`, { method: "POST" }); }
  createReviewSession(body: unknown) { return this.req<unknown>("/review-sessions", { method: "POST", body: JSON.stringify(body) }); }
  addReviewer(sessionId: string, body: unknown) { return this.req<unknown>(`/review-sessions/${sessionId}/invites`, { method: "POST", body: JSON.stringify(body) }); }
  getReviewExamples(captureId: string) { return this.req<unknown>(`/captures/${captureId}/review-examples`); }
  getDecisionReport(sessionId: string) { return this.req<unknown>(`/review-sessions/${sessionId}/report`); }
}
