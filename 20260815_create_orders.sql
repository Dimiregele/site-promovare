create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  stripe_session_id text unique not null,
  stripe_payment_intent text,
  customer_name text not null default '',
  customer_email text not null default '',
  customer_phone text,
  billing_vat_code text,
  billing_address text,
  billing_city text,
  shipping_address text,
  amount_ron numeric not null default 0,
  status text not null default 'paid',
  smartbill_invoice_number text,
  smartbill_invoice_series text,
  smartbill_raw_response jsonb,
  smartbill_error text
);

alter table orders enable row level security;

-- Intenționat: nicio politică publică. Singurul scriitor e webhook-ul
-- Stripe, care folosește service role key (vezi lib/supabase-admin.ts)
-- și ocolește RLS complet. Dacă vrei să vezi comenzile în super-admin
-- (/admin-x7k2), adaugă o politică separată acolo, legată de contul tău
-- de super-admin, nu una publică.
