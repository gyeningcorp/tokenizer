import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth";
import { eventsRoutes } from "./routes/events";
import { analyticsRoutes } from "./routes/analytics";
import { billingRoutes } from "./routes/billing";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: [
      "chrome-extension://*",
      "moz-extension://*",
      "https://tokenizer.dev",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Authorization", "Content-Type"],
  })
);

// Health check
app.get("/", (c) => c.json({ name: "Tokenizer Cloud", version: "0.1.0", status: "ok" }));
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/api/auth", authRoutes);
app.route("/api/events", eventsRoutes);
app.route("/api/analytics", analyticsRoutes);
app.route("/api/billing", billingRoutes);

const port = Number(process.env.PORT) || 3000;
console.log(`Tokenizer Cloud running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
