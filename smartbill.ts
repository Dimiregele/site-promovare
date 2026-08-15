// Client minimal pentru API-ul SmartBill Cloud (facturare RO).
//
// Documentat oficial la https://api.smartbill.ro/ -- răspunsul exact la
// crearea facturii nu e documentat public în detaliu, așa că întoarcem
// și `raw` complet, ca să poți depana primele facturi reale fără să
// presupunem forma exactă a câmpurilor.
//
// IMPORTANT: accesul la API nu e activat automat pe cont. Se cere prin
// meniul "Contul meu > Integrări" din SmartBill sau prin email la
// vreauapi@smartbill.ro -- fă asta înainte să testezi.
//
// Rate limit oficial: 3 cereri/secundă (nu e o problemă la volumul tău).

type SmartBillClient = {
  name: string;
  vatCode?: string;
  regCom?: string;
  address?: string;
  city?: string;
  county?: string;
  country: string;
  email?: string;
  isTaxPayer?: boolean;
  saveToDb?: boolean;
};

type SmartBillProduct = {
  name: string;
  code?: string;
  measuringUnitName: string;
  quantity: number;
  price: number;
  isTaxIncluded: boolean;
  taxName: string;
  taxPercentage: number;
  isService?: boolean;
};

export type SmartBillInvoiceResult = {
  number: string | null;
  series: string | null;
  raw: unknown;
};

export async function createSmartBillInvoice(params: {
  client: SmartBillClient;
  products: SmartBillProduct[];
  seriesName: string;
}): Promise<SmartBillInvoiceResult> {
  const email = process.env.SMARTBILL_EMAIL;
  const token = process.env.SMARTBILL_TOKEN;
  const companyVatCode = process.env.SMARTBILL_CIF;

  if (!email || !token || !companyVatCode) {
    throw new Error("Lipsesc SMARTBILL_EMAIL / SMARTBILL_TOKEN / SMARTBILL_CIF din variabilele de mediu.");
  }

  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const issueDate = new Date().toISOString().slice(0, 10);

  const body = {
    companyVatCode,
    client: { saveToDb: false, ...params.client },
    issueDate,
    seriesName: params.seriesName,
    isDraft: false,
    currency: "RON",
    products: params.products,
  };

  const res = await fetch("https://ws.smartbill.ro/SBORO/api/invoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(`SmartBill a refuzat factura (${res.status}): ${JSON.stringify(raw)}`);
  }

  return {
    number: (raw && typeof raw === "object" && "number" in raw ? String((raw as Record<string, unknown>).number) : null),
    series: (raw && typeof raw === "object" && "series" in raw ? String((raw as Record<string, unknown>).series) : params.seriesName),
    raw,
  };
}
