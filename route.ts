import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getAdminClient } from "@/lib/supabase-admin";
import { createSmartBillInvoice } from "@/lib/smartbill";

// Verificarea semnăturii Stripe are nevoie de body-ul brut (nu JSON deja
// parsat) -- de asta citim cu req.text(), nu req.json().
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Lipsește semnătura Stripe." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Semnătură Stripe invalidă:", err);
    return NextResponse.json({ error: "Semnătură invalidă." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = (session.metadata ?? {}) as Record<string, string>;
  const supabase = getAdminClient();

  // Idempotență -- Stripe poate retrimite același eveniment de mai multe
  // ori. Fără verificarea asta, am risca o factură dublă în SmartBill.
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const amountRon = (session.amount_total ?? 0) / 100;
  const customerEmail = meta.customerEmail || session.customer_details?.email || "";
  const customerName = meta.customerName || session.customer_details?.name || "Client ScanVogue";

  let smartbillNumber: string | null = null;
  let smartbillSeries: string | null = null;
  let smartbillRaw: unknown = null;
  let smartbillError: string | null = null;

  try {
    // ATENȚIE la cota de TVA (21% "Normala" mai jos) -- e valabilă doar
    // dacă ScanVogue e plătitor de TVA. Dacă emiți ca PFA/SRL neplătitor,
    // scoate taxPercentage/taxName sau ajustează conform regimului tău.
    const invoice = await createSmartBillInvoice({
      seriesName: process.env.SMARTBILL_SERIES || "SVGE",
      client: {
        name: customerName,
        vatCode: meta.billingVatCode || undefined,
        address: meta.billingAddress || undefined,
        city: meta.billingCity || undefined,
        email: customerEmail || undefined,
        country: "Romania",
        isTaxPayer: Boolean(meta.billingVatCode),
      },
      products: [
        {
          name: "Stand ScanVogue personalizat + platformă",
          measuringUnitName: "buc",
          quantity: 1,
          price: amountRon,
          isTaxIncluded: true,
          taxName: "Normala",
          taxPercentage: 21,
        },
      ],
    });
    smartbillNumber = invoice.number;
    smartbillSeries = invoice.series;
    smartbillRaw = invoice.raw;
  } catch (err) {
    // Nu blocăm comanda dacă facturarea automată eșuează -- clientul a
    // plătit deja. Salvăm eroarea ca să poți emite factura manual din
    // contul SmartBill și să depanezi integrarea fără presiune.
    smartbillError = err instanceof Error ? err.message : String(err);
    console.error("Eroare SmartBill:", smartbillError);
  }

  await supabase.from("orders").insert({
    stripe_session_id: session.id,
    stripe_payment_intent:
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: meta.customerPhone || null,
    billing_vat_code: meta.billingVatCode || null,
    billing_address: meta.billingAddress || null,
    billing_city: meta.billingCity || null,
    shipping_address: meta.shippingAddress || null,
    amount_ron: amountRon,
    status: "paid",
    smartbill_invoice_number: smartbillNumber,
    smartbill_invoice_series: smartbillSeries,
    smartbill_raw_response: smartbillRaw,
    smartbill_error: smartbillError,
  });

  // Confirmare pe email, refolosind aceiași helperi ca la răspunsurile
  // către reclamații -- același stil, aceeași infrastructură Resend.
  try {
    const { resend } = await import("@/lib/resend");
    const { wrapEmailHtml, paragraphHtml, signatureHtml } = await import("@/lib/email-html");

    if (customerEmail) {
      const html = wrapEmailHtml(
        [
          paragraphHtml(`Bună${customerName ? " " + customerName : ""},`),
          paragraphHtml("Mulțumim pentru comandă! Standul tău personalizat va fi expediat în curând la adresa indicată."),
          smartbillNumber ? paragraphHtml(`Factura fiscală: ${smartbillSeries}${smartbillNumber}.`) : paragraphHtml("Factura fiscală urmează să îți fie trimisă separat."),
          signatureHtml("ScanVogue"),
        ].join("\n")
      );

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "ScanVogue <notificari@scanvogue.ro>",
        to: customerEmail,
        subject: "Comanda ta ScanVogue — confirmată",
        text: [
          `Bună${customerName ? " " + customerName : ""},`,
          "",
          "Mulțumim pentru comandă! Standul tău personalizat va fi expediat în curând la adresa indicată.",
          smartbillNumber ? `Factura fiscală: ${smartbillSeries}${smartbillNumber}.` : "Factura fiscală urmează să îți fie trimisă separat.",
          "",
          "— ScanVogue",
        ].join("\n"),
        html,
      });
    }
  } catch (err) {
    // Emailul de confirmare e un plus, nu un blocaj -- comanda tot există
    // în baza de date chiar dacă emailul eșuează.
    console.error("Eroare la trimiterea emailului de confirmare:", err);
  }

  return NextResponse.json({ received: true });
}
