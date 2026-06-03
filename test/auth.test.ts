import { describe, it, expect } from "vitest";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { verifyToken, protectedResourceMetadata } from "../src/auth.js";

const ISSUER = "https://as.example";
const RESOURCE = "https://mcp.example";

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  const jwks = { keys: [jwk] };
  const mint = (claims: Record<string, unknown> = {}) =>
    new SignJWT({ ...claims })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(ISSUER).setAudience(RESOURCE).setSubject("user-1")
      .setIssuedAt().setExpirationTime("1h").sign(privateKey);
  return { jwks, mint, privateKey };
}

describe("verifyToken", () => {
  it("accepts a valid token and returns the subject", async () => {
    const { jwks, mint } = await setup();
    const token = await mint();
    const sub = await verifyToken(token, { jwks, issuer: ISSUER, resourceUrl: RESOURCE });
    expect(sub).toBe("user-1");
  });

  it("rejects a token with the wrong audience", async () => {
    const { jwks, privateKey } = await setup();
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(ISSUER).setAudience("https://other").setSubject("u")
      .setIssuedAt().setExpirationTime("1h").sign(privateKey);
    await expect(verifyToken(token, { jwks, issuer: ISSUER, resourceUrl: RESOURCE })).rejects.toBeDefined();
  });

  it("throws when no key source is supplied", async () => {
    await expect(verifyToken("x", { issuer: ISSUER, resourceUrl: RESOURCE } as any)).rejects.toThrow(/jwks or keyset/);
  });

  it("protectedResourceMetadata names the AS", () => {
    const meta = protectedResourceMetadata(RESOURCE, ISSUER);
    expect(meta.resource).toBe(RESOURCE);
    expect(meta.authorization_servers).toContain(ISSUER);
  });
});
