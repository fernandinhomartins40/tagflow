import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY ?? "";

export const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: "2024-06-20" })
  : null;

export const requireStripe = () => {
  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is required");
  }
  return stripe;
};
