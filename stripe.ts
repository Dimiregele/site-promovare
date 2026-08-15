import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY lipsește din variabilele de mediu.");
}

// Nu fixăm apiVersion explicit -- Stripe folosește versiunea implicită
// setată pe cont (vezi Dashboard > Developers > API version). Dacă ai
// nevoie de o versiune anume, adaug-o aici după ce o confirmi în cont.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
