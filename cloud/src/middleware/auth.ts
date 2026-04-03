import { Context, Next } from "hono";
import * as jose from "jose";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface AuthUser {
  id: string;
  email: string;
  plan: string;
}

/** Verify JWT and attach user to context */
export async function requireAuth(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = header.slice(7);
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    c.set("user", {
      id: payload.sub,
      email: payload.email,
      plan: payload.plan || "free",
    } as AuthUser);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}

/** Require an active Pro or Team subscription */
export async function requirePro(c: Context, next: Next) {
  const user = c.get("user") as AuthUser;
  if (user.plan !== "pro" && user.plan !== "team") {
    return c.json({ error: "Pro subscription required" }, 403);
  }
  await next();
}

/** Sign a new JWT for a user */
export async function signToken(user: { id: string; email: string; plan: string }): Promise<string> {
  return new jose.SignJWT({ email: user.email, plan: user.plan })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}
