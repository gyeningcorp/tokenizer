import { Hono } from "hono";
import { requireAuth, type AuthUser } from "../middleware/auth";

export const billingRoutes = new Hono();

// Stripe is initialized lazily — only when STRIPE_SECRET_KEY is set
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  // Dynamic import to avoid requiring stripe in dev
  return import("stripe").then((m) => new m.default(key));
}

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout session for Pro upgrade.
 */
billingRoutes.post("/checkout", requireAuth, async (c) => {
  const user = c.get("user") as AuthUser;
  const stripe = await getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Tokenizer Cloud Pro",
            description: "Unlimited session history, analytics dashboard, monthly reports",
          },
          unit_amount: 800, // $8.00
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    success_url: "https://tokenizer.dev/dashboard?upgraded=true",
    cancel_url: "https://tokenizer.dev/pricing",
    metadata: { user_id: user.id },
  });

  return c.json({ url: session.url });
});

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal session for managing subscription.
 */
billingRoutes.post("/portal", requireAuth, async (c) => {
  const user = c.get("user") as AuthUser;
  // TODO: Look up stripe_id from database
  return c.json({ error: "Not yet implemented — need Stripe customer ID lookup" }, 501);
});

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events (subscription created/cancelled/updated).
 */
billingRoutes.post("/webhook", async (c) => {
  // TODO: Verify Stripe webhook signature
  // TODO: Handle checkout.session.completed → upgrade user to pro
  // TODO: Handle customer.subscription.deleted → downgrade user to free
  const body = await c.req.text();
  console.log("Stripe webhook received:", body.slice(0, 200));
  return c.json({ received: true });
});
