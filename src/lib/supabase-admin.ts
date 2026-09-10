import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client service_role : SERVEUR UNIQUEMENT (server actions, route handlers). Jamais côté navigateur.
// Créé paresseusement pour que `next build` n'exige pas les variables d'environnement :
// elles ne sont lues qu'au premier appel, avec un message clair si elles manquent.
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Configuration Supabase absente : renseigner NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (voir .env.example)."
    );
  }
  client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const real = getClient();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
