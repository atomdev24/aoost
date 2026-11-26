import { describe, expect, it } from "vitest";
import { allowedRedirect, resourceMetadataUrl, sha256 } from "./oauth";

describe("oauth helpers", () => {
  it("accepts https redirects and local http ones only", () => {
    expect(allowedRedirect("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(allowedRedirect("http://localhost:6274/callback")).toBe(true);
    expect(allowedRedirect("http://127.0.0.1/cb")).toBe(true);
    expect(allowedRedirect("http://evil.example/cb")).toBe(false);
    expect(allowedRedirect("javascript:alert(1)")).toBe(false);
    expect(allowedRedirect("not a url")).toBe(false);
  });

  it("hashes like PKCE S256 (RFC 7636 example)", async () => {
    expect(await sha256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("points clients at the protected-resource metadata", () => {
    expect(resourceMetadataUrl("https://alexoostendurp.com")).toBe("https://alexoostendurp.com/.well-known/oauth-protected-resource");
  });
});
