import { Hono } from "hono";
import { sql } from "../db/index";
import { requireAuth, signToken, type AuthUser } from "../middleware/auth";

export const authRoutes = new Hono();

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

  // TODO: Verify Google id_token with Google's public keys
  // For MVP, decode without verification (dev only)
  // In production, use jose.jwtVerify with Google JWKS
  const parts = id_token.split(".");
  if (parts.length !== 3) {
    return c.json({ error: "Invalid token format" }, 400);
  }

  let payload: { email?: string; name?: string; sub?: string };
  try {
    payload = JSON.parse(atob(parts[1]));
  } catch {
    return c.json({ error: "Invalid token payload" }, 400);
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
