import { jwtVerify, createLocalJWKSet, createRemoteJWKSet, type JSONWebKeySet } from "jose";
import type { JWTVerifyGetKey } from "jose";
import type { Request, Response, NextFunction } from "express";

// The key resolver returned by createLocalJWKSet / createRemoteJWKSet.
type KeyGetter = JWTVerifyGetKey;

export interface VerifyOpts {
  jwks?: JSONWebKeySet;   // static set (tests)
  keyset?: KeyGetter;     // pre-built resolver, reused across requests (prod)
  issuer: string;
  resourceUrl: string;
}

export async function verifyToken(token: string, opts: VerifyOpts): Promise<string> {
  const keyset = opts.keyset ?? (opts.jwks ? createLocalJWKSet(opts.jwks) : undefined);
  if (!keyset) throw new Error("verifyToken: supply jwks or keyset");
  const { payload } = await jwtVerify(token, keyset, {
    issuer: opts.issuer,
    audience: opts.resourceUrl,
  });
  if (!payload.sub) throw new Error("token missing sub");
  return payload.sub;
}

export function protectedResourceMetadata(resourceUrl: string, issuer: string) {
  return { resource: resourceUrl, authorization_servers: [issuer] };
}

export function requireBearer(opts: { issuer: string; jwksUrl: string; resourceUrl: string }) {
  const keyset = createRemoteJWKSet(new URL(opts.jwksUrl));  // built once, reused
  const challenge =
    `Bearer resource_metadata="${opts.resourceUrl}/.well-known/oauth-protected-resource"`;
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.header("authorization") ?? "";
    if (!header.startsWith("Bearer ")) {
      res.setHeader("WWW-Authenticate", challenge);
      return res.status(401).json({ error: "missing bearer token" });
    }
    const token = header.slice("Bearer ".length);
    try {
      const sub = await verifyToken(token, { keyset, issuer: opts.issuer, resourceUrl: opts.resourceUrl });
      (req as Request & { token?: string; userId?: string }).token = token;
      (req as Request & { token?: string; userId?: string }).userId = sub;
      return next();
    } catch {
      res.setHeader("WWW-Authenticate", challenge);
      return res.status(401).json({ error: "invalid token" });
    }
  };
}
