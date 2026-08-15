import OrderForm from "./order-form";

export const metadata = {
  title: "Comandă — ScanVogue",
};

export default function ComandaPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0B0A08",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 440, width: "100%" }}>
        <p style={{ color: "#8A7443", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
          Un singur preț
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F5F0E6", fontSize: 34, fontWeight: 600, margin: "0 0 10px" }}>
          Comandă standul ScanVogue
        </h1>
        <p style={{ color: "#9C9382", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          200 lei, o singură dată — stand personalizat, pagina de scanare pe brandul tău și panoul cu analytics și AI incluse.
        </p>
        <OrderForm />
      </div>
    </div>
  );
}
