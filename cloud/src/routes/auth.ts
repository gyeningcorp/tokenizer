import { Hono } from "hono";
import * as jose from "jose";
import { sql } from "../db/index";
import { requireAuth, signToken, type AuthUser } from "../middleware/auth";

export const authRoutes = new Hono();

const GOOGLE_JWKS = jose.createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID environment variable is required");
}

/**
 * POST /api/auth/google
 * Exchange a Google OAuth id_token for a Tokenizer Cloud JWT.
 * The extension uses chrome.identity.getAuthToken() to get this.
 */
authRoutes.post("/google", async (c) => {
  const { id_token } = await c.req.json<{ id_token: string }>();
  if (!id_token) {
    return c.json({ error: "id_token required" }, 400);
  }

  // Verify Google id_token signature and claims using Google's public JWKS
  let payload: jose.JWTPayload & { email?: string; name?: string };
  try {
    const result = await jose.jwtVerify(id_token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: GOOGLE_CLIENT_ID,
    });
    payload = result.payload as typeof payload;
  } catch (err) {
    return c.json({ error: "Invalid or expired Google token" }, 401);
  }

  if (!payload.email) {
    return c.json({ error: "Token missing email claim" }, 400);
  }

  // Upsert user
  const [user] = await sql`
    INSERT INTO users (email, name)
    VALUES (${payload.email}, ${payload.name || null})
    ON CONFLICT (email) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, users.name),
      updated_at = now()
    RETURNING id, email, plan
  `;

  const token = await signToken({ id: user.id, email: user.email, plan: user.plan });

  return c.json({ token, user: { id: user.id, email: user.email, plan: user.plan } });
});

/**
 * GET /api/auth/me
 * Returns current user info + plan status.
 */
authRoutes.get("/me", requireAuth, (c) => {
  const user = c.get("user") as AuthUser;
  return c.json({ user });
});
