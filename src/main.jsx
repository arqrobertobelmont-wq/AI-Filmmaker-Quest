import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import ArcadeConsole from "../consola-director_2.jsx";
import Login from "./Login.jsx";
import { supabase } from "./supabase.js";

// ---- storage respaldado por Supabase (una fila por usuario) ----
// Mantiene la misma interfaz que usaba la app (get => {value}, set(key, value)).
let currentUserId = null;
window.storage = {
  get: async () => {
    if (!currentUserId) return null;
    const { data, error } = await supabase
      .from("user_states")
      .select("data")
      .eq("user_id", currentUserId)
      .maybeSingle();
    if (error || !data || data.data == null) return null;
    return { value: JSON.stringify(data.data) };
  },
  set: async (_key, value) => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from("user_states")
      .upsert({ user_id: currentUserId, data: JSON.parse(value), updated_at: new Date().toISOString() });
    if (error) throw error;
  },
};

function Root() {
  const [session, setSession] = useState(undefined); // undefined = cargando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      currentUserId = data.session?.user?.id ?? null;
      setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      currentUserId = s?.user?.id ?? null;
      setSession(s ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div style={{ minHeight: "100vh", background: "#1C1136", color: "#A99AD6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "ui-monospace,monospace", fontSize: 13 }}>CARGANDO…</div>;
  }
  if (!session) return <Login />;

  const onLogout = () => supabase.auth.signOut();
  return <ArcadeConsole key={session.user.id} onLogout={onLogout} userEmail={session.user.email} />;
}

createRoot(document.getElementById("root")).render(<Root />);
