import { Hono } from "hono";
import { sql } from "../db/index";
import { requireAuth, requirePro, type AuthUser } from "../middleware/auth";

export const eventsRoutes = new Hono();

interface TokenEvent {
  platform: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  input_cost: number;
  output_cost: number;
  session_id?: string;
  recorded_at: string; // ISO timestamp
}

/**
 * POST /api/events
 * Batch ingest token usage events from the extension.
 * Accepts an array of events (max 100 per request).
 */
eventsRoutes.post("/", requireAuth, requirePro, async (c) => {
  const user = c.get("user") as AuthUser;
  const { events } = await c.req.json<{ events: TokenEvent[] }>();

  if (!Array.isArray(events) || events.length === 0) {
    return c.json({ error: "events array required" }, 400);
  }

  if (events.length > 100) {
    return c.json({ error: "Max 100 events per batch" }, 400);
  }

  // Validate and insert
  const rows = events.map((e) => ({
    user_id: user.id,
    platform: e.platform || "unknown",
    model: e.model || "unknown",
    input_tokens: e.input_tokens || 0,
    output_tokens: e.output_tokens || 0,
    input_cost: e.input_cost || 0,
    output_cost: e.output_cost || 0,
    session_id: e.session_id || null,
    recorded_at: e.recorded_at || new Date().toISOString(),
  }));

  await sql`INSERT INTO events ${sql(rows)}`;

  return c.json({ ok: true, ingested: rows.length });
});

/**
 * POST /api/events/sessions/sync
 * Sync a complete session snapshot from the extension.
 */
eventsRoutes.post("/sessions/sync", requireAuth, requirePro, async (c) => {
  const user = c.get("user") as AuthUser;
  const body = await c.req.json<{
    ext_session_id: string;
    total_input: number;
    total_output: number;
    total_cost: number;
    calls: number;
    started_at: string;
  }>();

  await sql`
    INSERT INTO sessions (user_id, ext_session_id, total_input, total_output, total_cost, calls, started_at)
    VALUES (
      ${user.id},
      ${body.ext_session_id},
      ${body.total_input},
      ${body.total_output},
      ${body.total_cost},
      ${body.calls},
      ${body.started_at}
    )
    ON CONFLICT DO NOTHING
  `;

  return c.json({ ok: true });
});
