// Pagina de succes e doar confirmare vizuală -- comanda e deja procesată
// de webhook-ul Stripe (independent de faptul că userul ajunge sau nu
// aici, ex. dacă închide tab-ul). Nu facem nicio scriere în DB din pagina
// asta, ca să nu depindem de un pas care poate fi sărit de client.

export const metadata = {
  title: "Comandă confirmată — ScanVogue",
};

export default function SuccesPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0B0A08",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 440 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "1.5px solid #8FD3A0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: "#8FD3A0",
          }}
        >
          ✓
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F5F0E6", fontSize: 26, marginBottom: 10 }}>
          Comanda ta a fost confirmată
        </h1>
        <p style={{ color: "#9C9382", fontSize: 14, lineHeight: 1.6 }}>
          Îți trimitem factura fiscală și confirmarea pe email în câteva minute. Standul tău personalizat ajunge la adresa indicată în câteva zile lucrătoare.
        </p>
      </div>
    </div>
  );
}
