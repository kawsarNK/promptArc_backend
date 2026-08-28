import { Router } from "express";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { Payment } from "../models/Payment.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { createNotification } from "../utils/notifications.js";

export const paymentsRouter = Router();
const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;
const clientUrl = env.clientUrl.split(",")[0].trim().replace(/\/+$/, "");

function safeReturnPath(value) {
  const candidate = String(value || "").trim();
  // Stripe metadata values are limited, so keep this path compact as well as local.
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || candidate.length > 400)
    return "/prompts";
  return candidate;
}

async function activatePremium(session, expectedUserId) {
  const userId = session.metadata?.userId;
  if (!userId || (expectedUserId && userId !== expectedUserId))
    throw new HttpError(403, "This payment belongs to another account");
  if (session.payment_status !== "paid")
    throw new HttpError(402, "Payment is not complete");
  if (session.mode !== "payment" || Number(session.amount_total) !== 500 || String(session.currency).toLowerCase() !== "usd")
    throw new HttpError(400, "Payment session does not match the PromptArc Premium plan");
  const account = await User.findById(userId);
  if (!account)
    throw new HttpError(404, "Payment user not found");
  const alreadyPaid = await Payment.exists({ stripeSessionId: session.id, status: "paid" });
  await Payment.findOneAndUpdate(
    { stripeSessionId: session.id },
    {
      user: userId,
      email: session.customer_details?.email || session.customer_email || account.email,
      stripeSessionId: session.id,
      paymentIntentId: String(session.payment_intent || ""),
      amount: session.amount_total || 500,
      currency: session.currency || "usd",
      status: "paid",
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  account.subscription = "premium";
  account.premiumSince ||= new Date();
  const user = await account.save();
  if (!alreadyPaid) {
    await createNotification({
      recipient: user._id,
      type: "premium-activated",
      title: "Premium access activated",
      message: "Every premium prompt is now unlocked for your account.",
      link: "/prompts",
    });
  }
  return user;
}

paymentsRouter.post("/create-checkout-session", requireAuth, asyncHandler(async (req, res) => {
  if (!stripe)
    throw new HttpError(503, "Stripe is not configured");
  if (req.user.subscription === "premium")
    throw new HttpError(409, "Your account is already Premium");
  const returnTo = safeReturnPath(req.body.returnTo);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: req.user.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: 500,
        product_data: { name: "PromptArc Premium", description: "Lifetime access to all premium prompts" },
      },
    }],
    metadata: { userId: req.user.id, returnTo },
    success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent(returnTo)}`,
    cancel_url: `${clientUrl}/payment?next=${encodeURIComponent(returnTo)}`,
  });
  if (!session.url)
    throw new HttpError(500, "Stripe did not return a checkout URL");
  await Payment.findOneAndUpdate(
    { stripeSessionId: session.id },
    {
      user: req.user._id,
      email: req.user.email,
      stripeSessionId: session.id,
      paymentIntentId: String(session.payment_intent || ""),
      amount: 500,
      currency: "usd",
      status: "pending",
    },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  res.status(201).json({ url: session.url });
}));

paymentsRouter.get("/verify/:sessionId", requireAuth, asyncHandler(async (req, res) => {
  if (!stripe)
    throw new HttpError(503, "Stripe is not configured");
  const sessionId = String(req.params.sessionId || "");
  if (!sessionId)
    throw new HttpError(400, "Missing Stripe session");
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const user = await activatePremium(session, req.user.id);
  res.json({ user, message: "Premium access activated" });
}));

export const paymentWebhook = async (req, res, next) => {
  try {
    if (!stripe || !env.stripeWebhookSecret)
      throw new HttpError(503, "Stripe webhook is not configured");
    const signature = req.headers["stripe-signature"];
    if (!signature)
      throw new HttpError(400, "Missing Stripe signature");
    const event = stripe.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
    if (event.type === "checkout.session.completed")
      await activatePremium(event.data.object);
    res.json({ received: true });
  }
  catch (error) {
    next(error);
  }
};
