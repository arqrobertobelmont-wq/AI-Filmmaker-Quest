import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

if (!url || !key) {
  // Falla clara si faltan las variables de entorno (local: .env.local / prod: Vercel)
  console.error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_KEY");
}

export const supabase = createClient(url, key);
