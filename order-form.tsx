"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { createCheckoutSession } from "./actions";

const initialForm = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  billingVatCode: "",
  billingAddress: "",
  billingCity: "",
  shippingAddress: "",
};

export default function OrderForm() {
  const [form, setForm] = useState(initialForm);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = (key: keyof typeof initialForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const billingAddress = sameAsShipping ? form.shippingAddress : form.billingAddress;
        const url = await createCheckoutSession({ ...form, billingAddress });
        window.location.href = url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "A apărut o eroare. Încearcă din nou.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input required placeholder="Nume (persoană sau firmă)" value={form.customerName} onChange={update("customerName")} style={inputStyle} />
      <input required type="email" placeholder="Email" value={form.customerEmail} onChange={update("customerEmail")} style={inputStyle} />
      <input placeholder="Telefon" value={form.customerPhone} onChange={update("customerPhone")} style={inputStyle} />
      <input placeholder="CUI firmă (opțional, pentru factură pe firmă)" value={form.billingVatCode} onChange={update("billingVatCode")} style={inputStyle} />
      <input required placeholder="Adresă de livrare a standului" value={form.shippingAddress} onChange={update("shippingAddress")} style={inputStyle} />

      <label style={{ fontSize: 13, color: "#9C9382", display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={sameAsShipping} onChange={(e) => setSameAsShipping(e.target.checked)} />
        Adresa de facturare e aceeași cu cea de livrare
      </label>

      {!sameAsShipping && (
        <>
          <input placeholder="Adresă de facturare" value={form.billingAddress} onChange={update("billingAddress")} style={inputStyle} />
          <input placeholder="Oraș" value={form.billingCity} onChange={update("billingCity")} style={inputStyle} />
        </>
      )}

      {error && <p style={{ color: "#E08585", fontSize: 13, margin: 0 }}>{error}</p>}

      <button type="submit" disabled={isPending} style={{ ...submitStyle, opacity: isPending ? 0.6 : 1 }}>
        {isPending ? "Se pregătește plata…" : "Comandă acum — 200 lei"}
      </button>

      <p style={{ color: "#6B6558", fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>
        Plată securizată prin Stripe. Factura fiscală se emite automat prin SmartBill imediat după confirmarea plății.
      </p>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.03)",
  color: "#F5F0E6",
  fontSize: 14,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const submitStyle: React.CSSProperties = {
  padding: "14px 20px",
  borderRadius: 8,
  border: "none",
  background: "#C6A15B",
  color: "#100F0D",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
