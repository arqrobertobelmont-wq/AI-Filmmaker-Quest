import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import ArcadeConsole from "../consola-director_2.jsx";
import Login from "./Login.jsx";
import StatsPage from "./StatsPage.jsx";
import { supabase } from "./supabase.js";

// ---- publicador de stats agregadas (tabla public_stats, lectura publica) ----
// Solo numeros: nada de notas, intenciones ni tareas domesticas.
// Solo publica la cuenta real: las cuentas de prueba guardan su estado privado pero no pisan las stats publicas.
const PUBLIC_STATS_OWNER = "7ef328ab-d69c-4bb4-9f4a-43579c0b1ada";
let lastPublished = null;
const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
async function publishPublicStats(stateJson) {
  try {
    if (currentUserId !== PUBLIC_STATS_OWNER) return; // solo la cuenta real publica
    const d = JSON.parse(stateJson);
    const practice = d.practice || [];
    const pieces = d.pieces || [];
    const days = [];
    for (let i = 34; i >= 0; i--) { const dt = new Date(); dt.setDate(dt.getDate() - i); days.push(localDateStr(dt)); }
    const byDay = {};
    days.forEach((dd) => { byDay[dd] = { date: dd, work_min: 0, study_min: 0, sessions: 0 }; });
    practice.forEach((s) => {
      const r = byDay[s.date]; if (!r || s.film === "tarea") return; // tareas: nunca publicas
      if (s.film === "study") r.study_min += s.minutes || 0; else r.work_min += s.minutes || 0;
      r.sessions += 1;
    });
    const isFinal = (p) => !!p.phases?.final;
    const filmsDone = pieces.filter(isFinal).length;
    const footage = pieces.filter(isFinal).reduce((a, p) => a + (p.minutes || 0), 0);
    const main = pieces.find((p) => p.id === d.mainFilmId && !isFinal(p));
    let cycle = { cycle_film: null, cycle_step: null, cycle_days: null };
    if (main) {
      const dates = Object.values(main.steps || {}).sort();
      cycle = {
        cycle_film: main.film,
        cycle_step: Object.keys(main.steps || {}).length,
        cycle_days: dates.length ? Math.round((new Date(dates[dates.length - 1] + "T00:00") - new Date(dates[0] + "T00:00")) / 864e5) + 1 : 0,
      };
    }
    const todayD = days[days.length - 1];
    const rows = days.map((dd) => ({
      ...byDay[dd],
      streak: d.streak?.count ?? 0,
      films_done: filmsDone,
      footage_min: footage,
      cycle_film: dd === todayD ? cycle.cycle_film : null,
      cycle_step: dd === todayD ? cycle.cycle_step : null,
      cycle_days: dd === todayD ? cycle.cycle_days : null,
      updated_at: new Date().toISOString(),
    }));
    const key = JSON.stringify(rows.map((r) => [r.date, r.work_min, r.study_min, r.sessions, r.streak, r.films_done, r.footage_min, r.cycle_film, r.cycle_step, r.cycle_days]));
    if (key === lastPublished) return; // sin cambios, no spamear
    const { error } = await supabase.from("public_stats").upsert(rows);
    if (!error) lastPublished = key;
  } catch (e) { /* nunca romper el guardado principal */ }
}

// ---- storage respaldado por Supabase (una fila por usuario) ----
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
    publishPublicStats(value); // fire-and-forget: no bloquea ni rompe el save
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

// /stats es publica: sin login
const path = window.location.pathname.replace(/\/+$/, "");
createRoot(document.getElementById("root")).render(path === "/stats" ? <StatsPage /> : <Root />);
