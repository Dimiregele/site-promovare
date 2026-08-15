import { createClient } from "@supabase/supabase-js";

// getServerClient() din lib/supabase-server.ts e legat de cookie-urile
// cererii (auth de utilizator) și e supus RLS -- perfect pentru actions.ts,
// dar INUTILIZABIL în webhook-ul Stripe, unde nu există sesiune de user.
// Clientul de mai jos folosește service role key-ul, care ocolește RLS
// complet -- de asta NU trebuie folosit decât în cod server-to-server de
// încredere (webhook-uri, joburi programate), niciodată expus spre client.
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Lipsesc NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
