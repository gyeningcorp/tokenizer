import { Hono } from "hono";
import { sql } from "../db/index";
import { requireAuth, requirePro, type AuthUser } from "../middleware/auth";

export const analyticsRoutes = new Hono();

/**
 * GET /api/analytics/summary
 * Monthly totals for the current user.
 * Query params: ?months=3 (default 1)
 */
analyticsRoutes.get("/summary", requireAuth, requirePro, async (c) => {
  const user = c.get("user") as AuthUser;
  const months = Math.min(Number(c.req.query("months")) || 1, 12);
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const [summary] = await sql`
    SELECT
      COALESCE(SUM(input_tokens), 0)::int AS total_input_tokens,
      COALESCE(SUM(output_tokens), 0)::int AS total_output_tokens,
      COALESCE(SUM(input_cost + output_cost), 0)::numeric(10,4) AS total_cost,
      COUNT(*)::int AS total_calls
    FROM events
    WHERE user_id = ${user.id}
      AND recorded_at >= ${since.toISOString()}
  `;

  return c.json({ summary, period: { since: since.toISOString(), months } });
});

/**
 * GET /api/analytics/by-model
 * Cost breakdown grouped by model.
 */
analyticsRoutes.get("/by-model", requireAuth, requirePro, async (c) => {
  const user = c.get("user") as AuthUser;
  const days = Math.min(Number(c.req.query("days")) || 30, 365);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await sql`
    SELECT
      model,
      SUM(input_tokens)::int AS input_tokens,
      SUM(output_tokens)::int AS output_tokens,
      SUM(input_cost + output_cost)::numeric(10,4) AS total_cost,
      COUNT(*)::int AS calls
    FROM events
    WHERE user_id = ${user.id}
      AND recorded_at >= ${since.toISOString()}
    GROUP BY model
    ORDER BY total_cost DESC
  `;

  return c.json({ breakdown: rows, days });
});

/**
 * GET /api/analytics/by-platform
 * Cost breakdown grouped by platform.
 */
analyticsRoutes.get("/by-platform", requireAuth, requirePro, async (c) => {
  const user = c.get("user") as AuthUser;
  const days = Math.min(Number(c.req.query("days")) || 30, 365);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await sql`
    SELECT
      platform,
      SUM(input_tokens)::int AS input_tokens,
      SUM(output_tokens)::int AS output_tokens,
      SUM(input_cost + output_cost)::numeric(10,4) AS total_cost,
      COUNT(*)::int AS calls
    FROM events
    WHERE user_id = ${user.id}
      AND recorded_at >= ${since.toISOString()}
    GROUP BY platform
    ORDER BY total_cost DESC
  `;

  return c.json({ breakdown: rows, days });
});

/**
 * GET /api/analytics/daily
 * Daily spend timeseries for charting.
 */
analyticsRoutes.get("/daily", requireAuth, requirePro, async (c) => {
  const user = c.get("user") as AuthUser;
  const days = Math.min(Number(c.req.query("days")) || 30, 90);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await sql`
    SELECT
      DATE(recorded_at) AS date,
      SUM(input_tokens)::int AS input_tokens,
      SUM(output_tokens)::int AS output_tokens,
      SUM(input_cost + output_cost)::numeric(10,4) AS total_cost,
      COUNT(*)::int AS calls
    FROM events
    WHERE user_id = ${user.id}
      AND recorded_at >= ${since.toISOString()}
    GROUP BY DATE(recorded_at)
    ORDER BY date
  `;

  return c.json({ daily: rows, days });
});

/**
 * GET /api/analytics/sessions
 * Paginated session history.
 */
analyticsRoutes.get("/sessions", requireAuth, requirePro, async (c) => {
  const user = c.get("user") as AuthUser;
  const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
  const offset = Number(c.req.query("offset")) || 0;

  const rows = await sql`
    SELECT *
    FROM sessions
    WHERE user_id = ${user.id}
    ORDER BY started_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return c.json({ sessions: rows, limit, offset });
});
