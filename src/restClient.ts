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
      let detail = `HTTP ${resp.status}`;
      try { detail = (await resp.json() as { detail?: string }).detail ?? detail; } catch { /* ignore */ }
      throw new Error(detail);
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

  // Full prove-loop methods
  scaffoldExperiment(body: unknown) { return this.req<unknown>("/experiments/scaffold", { method: "POST", body: JSON.stringify(body) }); }
  createProxiedEndpoint(body: unknown) { return this.req<unknown>("/proxied-endpoints", { method: "POST", body: JSON.stringify(body) }); }
  listProxiedEndpoints() { return this.req<unknown>("/proxied-endpoints"); }
  replayCaptures(id: string) { return this.req<unknown>(`/proxied-endpoints/${id}/replay`, { method: "POST" }); }
  createReviewSession(body: unknown) { return this.req<unknown>("/review-sessions", { method: "POST", body: JSON.stringify(body) }); }
  addReviewer(sessionId: string, body: unknown) { return this.req<unknown>(`/review-sessions/${sessionId}/invites`, { method: "POST", body: JSON.stringify(body) }); }
  getReviewExamples(captureId: string) { return this.req<unknown>(`/captures/${captureId}/review-examples`); }
  getDecisionReport(sessionId: string) { return this.req<unknown>(`/review-sessions/${sessionId}/report`); }
}
