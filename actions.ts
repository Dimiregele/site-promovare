"use server";

import { stripe } from "@/lib/stripe";

const PRICE_RON = 200;

export type OrderDetails = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  billingVatCode: string;
  billingAddress: string;
  billingCity: string;
  shippingAddress: string;
};

// Creează sesiunea de plată Stripe și întoarce URL-ul spre pagina de
// checkout găzduită de Stripe. Datele de facturare (CUI, adresă) nu au
// un câmp nativ în Stripe Checkout pentru facturare românească, așa că
// le trimitem ca metadata și le recuperăm în webhook la confirmarea plății.
export async function createCheckoutSession(details: OrderDetails): Promise<string> {
  const trimmed: OrderDetails = {
    customerName: details.customerName.trim(),
    customerEmail: details.customerEmail.trim(),
    customerPhone: details.customerPhone.trim(),
    billingVatCode: details.billingVatCode.trim(),
    billingAddress: details.billingAddress.trim(),
    billingCity: details.billingCity.trim(),
    shippingAddress: details.shippingAddress.trim(),
  };

  if (!trimmed.customerName || !trimmed.customerEmail || !trimmed.shippingAddress) {
    throw new Error("Completează numele, emailul și adresa de livrare.");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://scanvogue.ro";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: trimmed.customerEmail,
    line_items: [
      {
        price_data: {
          currency: "ron",
          unit_amount: PRICE_RON * 100,
          product_data: {
            name: "Stand ScanVogue personalizat + platformă",
          },
        },
        quantity: 1,
      },
    ],
    metadata: trimmed,
    success_url: `${siteUrl}/comanda/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/comanda`,
  });

  if (!session.url) throw new Error("Stripe nu a returnat un link de plată.");
  return session.url;
}
