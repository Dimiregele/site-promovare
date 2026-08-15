# Integrare Stripe + SmartBill pentru comenzi ScanVogue

Ce face: pagina `/comanda` colectează datele clientului → creează o sesiune
Stripe Checkout → clientul plătește pe pagina Stripe → webhook-ul primește
confirmarea → salvează comanda în Supabase, emite factura fiscală automat
prin SmartBill și trimite emailul de confirmare prin Resend (aceeași
infrastructură pe care o ai deja pentru răspunsurile la reclamații).

## 1. Fișiere de adăugat în repo

Structura de mai jos, exact ca în acest pachet:

```
lib/stripe.ts
lib/supabase-admin.ts
lib/smartbill.ts
app/comanda/page.tsx
app/comanda/order-form.tsx
app/comanda/actions.ts
app/comanda/succes/page.tsx
app/api/webhooks/stripe/route.ts
supabase/migrations/20260815_create_orders.sql
```

Adaugă în `package.json`:

```
npm install stripe @supabase/supabase-js
```

(`@supabase/supabase-js` e diferit de `@supabase/ssr` pe care presupun că
îl ai deja pentru `getServerClient()` — ai nevoie de amândouă, unul pentru
cereri cu sesiune de user, unul pentru webhook fără sesiune.)

## 2. Rulează migrarea

Din Supabase MCP/dashboard, rulează `supabase/migrations/20260815_create_orders.sql`
pe proiectul `tkqdseeebubnswnpeeoy`.

## 3. Cont Stripe

1. Creează cont pe [stripe.com](https://stripe.com) dacă nu ai deja.
2. **Începe în modul test** — nu trece pe live până nu faci o comandă completă de test.
3. Developers → API keys → copiază **Secret key** → `STRIPE_SECRET_KEY`.
4. Developers → Webhooks → Add endpoint:
   - URL: `https://scanvogue.ro/api/webhooks/stripe`
   - Eveniment: `checkout.session.completed`
   - Copiază **Signing secret** → `STRIPE_WEBHOOK_SECRET`

## 4. Cont SmartBill

1. Ai nevoie de acces API activat pe cont — **nu e automat**. Cere-l din
   Contul meu → Integrări, sau prin email la `vreauapi@smartbill.ro`.
2. Din Contul meu → Integrări, generează un **token API**.
3. Creează (sau alege) o serie de facturare dedicată pentru comenzile
   online, ex. `SVGE` — o folosești în `SMARTBILL_SERIES`.
4. **Verifică regimul tău de TVA** înainte să lași codul așa cum e:
   `app/api/webhooks/stripe/route.ts` emite facturi cu `taxName: "Normala"`,
   `taxPercentage: 21` (cota standard RO din 2025). Dacă ești PFA/SRL
   neplătitor de TVA, asta e greșit — spune-mi regimul exact și ajustez.

## 5. Variabile de mediu (Netlify)

Toate cele de mai jos trebuie setate **ca secret** (spre deosebire de
variabilele Supabase publice de la build — astea sunt folosite doar la
runtime, într-o funcție serverless, nu la build):

| Variabilă | De unde |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → endpoint-ul creat |
| `SMARTBILL_EMAIL` | emailul contului tău SmartBill |
| `SMARTBILL_TOKEN` | Contul meu → Integrări → token API |
| `SMARTBILL_CIF` | CIF-ul firmei tale (ex. `RO12345678`) |
| `SMARTBILL_SERIES` | seria de facturare aleasă la pasul 4.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` |

Și una non-secretă (poate fi și hardcodată, dar mai curat ca env var):

| Variabilă | Valoare |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://scanvogue.ro` |

## 6. Testează înainte să dai live

1. Cu cheile Stripe în modul **test**, mergi pe `/comanda`, completează
   formularul, plătește cu cardul de test `4242 4242 4242 4242`, orice
   dată viitoare, orice CVC.
2. Verifică: (a) ai fost redirecționat pe `/comanda/succes`, (b) a apărut
   o linie nouă în tabela `orders` din Supabase, (c) a apărut o factură
   nouă (de test) în contul SmartBill, (d) ai primit emailul de confirmare.
3. Abia după ce toate patru funcționează, treci cheile Stripe pe **live**
   și repetă webhook-ul (Stripe are un endpoint separat pentru live).

## De reținut

- Dacă emiterea facturii SmartBill eșuează, comanda **tot se salvează** —
  clientul deja a plătit, nu vrem să pierdem comanda din cauza unei erori
  de facturare. Eroarea se salvează în `smartbill_error` pe rândul din
  `orders`, ca să poți emite manual și depana fără presiune.
- Emailul de confirmare e "best effort" — dacă Resend eșuează, nu strică
  restul fluxului.
- Pagina `/comanda/succes` e doar confirmare vizuală; comanda reală se
  procesează în webhook, independent de faptul că userul ajunge sau nu
  pe pagina de succes (poate închide tab-ul, tot funcționează).
