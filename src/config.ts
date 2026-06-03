export interface Config {
  apiUrl: string;
  issuer: string;
  jwksUrl: string;
  resourceUrl: string;
}

function required(env: Record<string, string | undefined>, key: string): string {
  const v = env[key];
  if (!v) throw new Error(`missing required env var: ${key}`);
  return v;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  return {
    apiUrl: required(env, "REDCROWN_API_URL"),
    issuer: required(env, "REDCROWN_AS_ISSUER"),
    jwksUrl: required(env, "REDCROWN_AS_JWKS_URL"),
    resourceUrl: required(env, "REDCROWN_RESOURCE_URL"),
  };
}
