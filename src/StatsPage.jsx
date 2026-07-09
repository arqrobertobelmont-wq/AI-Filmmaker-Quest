import React, { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// /stats — dashboard editorial oscuro (no 8-bit)
// Logueado (vos): calendario semanal con chunks (incluye tareas) + barras por dia, toggle semana/mes.
// Sin login: version publica de agregados (sin chunks ni tareas).
const T = {
  bg: "#0C0A12", panel: "#121017", line: "#242030", lineSoft: "#1A1722",
  text: "#EDEAF4", dim: "#8E87A0", faint: "#5A5468",
  accent: "#A78BFA", accentDim: "#4A4076", tarea: "#3A3644", gold: "#E3B341",
};
const DISPLAY = "'Fraunces', Georgia, serif";
const BODY = "'Archivo', 'Helvetica Neue', Arial, sans-serif";

const PHASE_NAMES = { idea: "Idea", writing: "Writing", storyboard: "Storyboard", visual: "Visual Design", shots: "Shots", edit: "Edit", post: "Post", review: "Review" };
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const mondayOf = (ds) => { const d = new Date(ds + "T00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return localDateStr(d); };
const addDays = (ds, n) => { const d = new Date(ds + "T00:00"); d.setDate(d.getDate() + n); return localDateStr(d); };
const fmtShort = (ds) => `${parseInt(ds.slice(8), 10)} ${MESES[parseInt(ds.slice(5, 7), 10) - 1].slice(0, 3)}`;

function agoLabel(iso) {
  if (!iso) return null;
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} dias`;
}

const card = { border: `1px solid ${T.line}`, background: T.panel, borderRadius: 4 };
const kicker = { fontFamily: BODY, fontSize: 11, letterSpacing: "0.18em", color: T.faint, textTransform: "uppercase" };

function StatCard({ label, value, sub, extra }) {
  return (
    <div style={{ ...card, padding: "26px 26px 22px" }}>
      <div style={{ ...kicker, marginBottom: 14 }}>{label}</div>
      <div style={{ fontFamily: DISPLAY, fontSize: 54, fontWeight: 600, lineHeight: 1, color: T.text, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontFamily: BODY, fontSize: 13, color: T.dim, marginTop: 10 }}>{sub}</div>}
      {extra}
    </div>
  );
}

function Shell({ live, children }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: BODY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Archivo:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        a{color:${T.dim};text-decoration:none;} a:hover{color:${T.accent};}
        button{font-family:'Archivo',sans-serif;}
        .statgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
        @media(max-width:760px){.statgrid{grid-template-columns:1fr 1fr!important;}}
        @media(max-width:480px){.statgrid{grid-template-columns:1fr!important;}}
      `}</style>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "56px 24px 48px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: BODY, fontSize: 12, letterSpacing: "0.28em", color: T.accent, textTransform: "uppercase", marginBottom: 10 }}>Robert Mutante</div>
            <h1 style={{ fontFamily: DISPLAY, fontSize: "clamp(40px, 7vw, 64px)", fontWeight: 600, lineHeight: 1.02, letterSpacing: "-0.025em" }}>AI Filmmaker</h1>
          </div>
          {live && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.dim, paddingBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, animation: "pulse 2s infinite" }} />
              ultima actividad {live}
            </div>
          )}
        </div>
        <p style={{ fontSize: 15, color: T.dim, maxWidth: 560, lineHeight: 1.6, marginBottom: 44 }}>
          Progreso en vivo de mi entrenamiento haciendo films con IA. Cada bloque es trabajo real.
        </p>
        {children}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${T.lineSoft}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontSize: 13, color: T.faint }}>
          <span>El objetivo: un film de 3 minutos por semana.</span>
          <a href="/">hecho con AI Filmmaker Quest →</a>
        </div>
      </div>
    </div>
  );
}

// ================== VISTA PRIVADA (logueado) ==================
function chunkOf(s, pieces) {
  if (s.film === "tarea") return { label: `tarea${s.intencion ? " - " + s.intencion : ""}`, kind: "tarea" };
  if (s.film === "study") return { label: "study", kind: "study" };
  const name = pieces.find((p) => p.id === s.film)?.film || "film";
  return { label: `${name} - ${PHASE_NAMES[s.phase] || "Foco"}`, kind: "film" };
}
const chunkColor = (kind) => kind === "film" ? T.accent : kind === "study" ? T.accentDim : T.tarea;
const workMin = (list) => list.filter((s) => s.film !== "tarea").reduce((a, s) => a + (s.minutes || 0), 0);

function PrivateStats({ data }) {
  const pieces = data.pieces || [];
  const practice = data.practice || [];
  const today = localDateStr(new Date());
  const [view, setView] = useState("week"); // week | month
  const [anchor, setAnchor] = useState(mondayOf(today)); // lunes (week) o cualquier dia del mes (month)
  const [selDay, setSelDay] = useState(null); // detalle en vista mes

  // dias del periodo visible
  let days = [];
  let title = "";
  if (view === "week") {
    days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
    title = `${fmtShort(days[0])} — ${fmtShort(days[6])}`;
  } else {
    const y = parseInt(anchor.slice(0, 4), 10), m = parseInt(anchor.slice(5, 7), 10);
    const nDays = new Date(y, m, 0).getDate();
    days = Array.from({ length: nDays }, (_, i) => `${anchor.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`);
    title = `${MESES[m - 1]} ${y}`;
  }
  const byDay = {};
  days.forEach((d) => { byDay[d] = []; });
  practice.forEach((s) => { if (byDay[s.date]) byDay[s.date].push(s); });
  days.forEach((d) => byDay[d].sort((a, b) => (a.start || "").localeCompare(b.start || "")));

  const nav = (dir) => {
    setSelDay(null);
    if (view === "week") setAnchor(addDays(anchor, dir * 7));
    else { const y = parseInt(anchor.slice(0, 4), 10), m = parseInt(anchor.slice(5, 7), 10) - 1 + dir; const d = new Date(y, m, 1); setAnchor(localDateStr(d)); }
  };
  const switchView = (v) => { setView(v); setSelDay(null); setAnchor(v === "week" ? mondayOf(today) : today.slice(0, 8) + "01"); };

  // stats de cabecera
  const wkStart = mondayOf(today);
  const weekH = workMin(practice.filter((s) => s.date >= wkStart)) / 60;
  const isFinal = (p) => !!p.phases?.final;
  const filmsDone = pieces.filter(isFinal).length;
  const footage = pieces.filter(isFinal).reduce((a, p) => a + (p.minutes || 0), 0);
  const main = pieces.find((p) => p.id === data.mainFilmId && !isFinal(p));
  const cycleStep = main ? Object.keys(main.steps || {}).length : null;

  // barras: max del periodo (min 5h)
  const maxMin = Math.max(300, ...days.map((d) => workMin(byDay[d])));

  const navBtn = { background: "none", border: `1px solid ${T.line}`, color: T.dim, borderRadius: 4, padding: "7px 13px", cursor: "pointer", fontSize: 13 };
  const toggleBtn = (v, label) => (
    <button onClick={() => switchView(v)} style={{ ...navBtn, background: view === v ? T.accent : "none", color: view === v ? "#14101E" : T.dim, borderColor: view === v ? T.accent : T.line, fontWeight: view === v ? 600 : 400 }}>{label}</button>
  );

  const monthTotals = (() => {
    const mk = today.slice(0, 7);
    const list = practice.filter((s) => s.date.slice(0, 7) === mk);
    return {
      prod: list.filter((s) => s.film !== "study" && s.film !== "tarea").reduce((a, s) => a + (s.minutes || 0), 0) / 60,
      study: list.filter((s) => s.film === "study").reduce((a, s) => a + (s.minutes || 0), 0) / 60,
      tarea: list.filter((s) => s.film === "tarea").reduce((a, s) => a + (s.minutes || 0), 0) / 60,
      dias: new Set(list.filter((s) => s.film !== "tarea").map((s) => s.date)).size,
    };
  })();

  return (
    <>
      <div className="statgrid" style={{ marginBottom: 12 }}>
        <StatCard label="Racha" value={`${data.streak?.count ?? 0}`} sub={(data.streak?.count ?? 0) === 1 ? "dia seguido" : "dias seguidos"} />
        <StatCard label="Esta semana" value={weekH.toFixed(1)} sub="horas de 35 planificadas" extra={
          <div style={{ marginTop: 12, height: 3, background: T.lineSoft, borderRadius: 2 }}>
            <div style={{ width: `${Math.min(100, (weekH / 35) * 100)}%`, height: "100%", background: T.accent, borderRadius: 2 }} />
          </div>
        } />
        <StatCard label="Films" value={`${filmsDone}`} sub={`terminados · ${footage} min de metraje`} />
        {main ? <StatCard label="Ciclo actual" value={`${cycleStep}/15`} sub={main.film} /> : <StatCard label="Ciclo actual" value="—" sub="sin film activo" />}
      </div>

      {/* control de periodo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "24px 0 12px", flexWrap: "wrap" }}>
        <button onClick={() => nav(-1)} style={navBtn}>‹</button>
        <button onClick={() => nav(1)} style={navBtn}>›</button>
        <span style={{ fontFamily: DISPLAY, fontSize: 20, marginLeft: 6, marginRight: "auto", textTransform: "capitalize" }}>{title}</span>
        {toggleBtn("week", "Semana")}
        {toggleBtn("month", "Mes")}
      </div>

      {/* CALENDARIO */}
      <div style={{ ...card, padding: 18, marginBottom: 12, overflowX: "auto" }}>
        {view === "week" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, minWidth: 640 }}>
            {days.map((d, i) => {
              const list = byDay[d];
              const h = workMin(list) / 60;
              const isToday = d === today;
              return (
                <div key={d} style={{ borderRadius: 4, border: `1px solid ${isToday ? T.accentDim : T.lineSoft}`, background: isToday ? "#15111F" : "transparent", padding: 8, minHeight: 150 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: isToday ? T.accent : T.faint, letterSpacing: "0.1em" }}>{DIAS[i]} {parseInt(d.slice(8), 10)}</span>
                    {h > 0 && <span style={{ fontFamily: DISPLAY, fontSize: 14, color: T.text }}>{h.toFixed(1)}h</span>}
                  </div>
                  {list.map((s) => {
                    const c = chunkOf(s, pieces);
                    return (
                      <div key={s.id} title={`${c.label} · ${s.minutes || 0} min`} style={{ background: chunkColor(c.kind), color: c.kind === "tarea" ? T.dim : "#14101E", borderRadius: 3, padding: "5px 7px", fontSize: 11.5, lineHeight: 1.3, marginBottom: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontWeight: c.kind === "film" ? 600 : 400 }}>
                        {c.label} <span style={{ opacity: 0.7 }}>· {Math.round((s.minutes || 0))}m</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, minWidth: 560 }}>
              {DIAS.map((l, i) => <div key={i} style={{ ...kicker, textAlign: "center", paddingBottom: 4 }}>{l}</div>)}
              {Array.from({ length: (new Date(days[0] + "T00:00").getDay() + 6) % 7 }).map((_, i) => <div key={`pad${i}`} />)}
              {days.map((d) => {
                const list = byDay[d];
                const h = workMin(list) / 60;
                const isToday = d === today;
                const sel = selDay === d;
                return (
                  <button key={d} onClick={() => setSelDay(sel ? null : d)} style={{ textAlign: "left", cursor: "pointer", borderRadius: 4, border: `1px solid ${sel ? T.accent : isToday ? T.accentDim : T.lineSoft}`, background: h > 0 ? `rgba(167,139,250,${Math.min(0.32, 0.06 + h / 18)})` : "transparent", padding: "6px 7px", minHeight: 56, color: T.text }}>
                    <div style={{ fontSize: 10, color: isToday ? T.accent : T.faint }}>{parseInt(d.slice(8), 10)}</div>
                    {h > 0 && <div style={{ fontFamily: DISPLAY, fontSize: 15 }}>{h.toFixed(1)}h</div>}
                    {list.some((s) => s.film === "tarea") && <div style={{ fontSize: 9, color: T.faint }}>+tareas</div>}
                  </button>
                );
              })}
            </div>
            {selDay && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${T.lineSoft}`, paddingTop: 12 }}>
                <div style={{ ...kicker, marginBottom: 8 }}>{fmtShort(selDay)}</div>
                {byDay[selDay].length === 0 && <span style={{ fontSize: 13, color: T.faint }}>Sin actividad.</span>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {byDay[selDay].map((s) => {
                    const c = chunkOf(s, pieces);
                    return <span key={s.id} style={{ background: chunkColor(c.kind), color: c.kind === "tarea" ? T.dim : "#14101E", borderRadius: 3, padding: "5px 9px", fontSize: 12, fontWeight: c.kind === "film" ? 600 : 400 }}>{c.label} · {Math.round(s.minutes || 0)}m</span>;
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* BARRAS horas por dia (trabajo, sin tareas) */}
      <div style={{ ...card, padding: "22px 22px 14px", marginBottom: 12 }}>
        <div style={{ ...kicker, marginBottom: 16 }}>Horas de trabajo por dia</div>
        <svg viewBox={`0 0 ${days.length * 30} 168`} style={{ width: "100%", display: "block", maxHeight: 220 }}>
          {maxMin >= 300 && <line x1="0" x2={days.length * 30} y1={140 - (300 / maxMin) * 112} y2={140 - (300 / maxMin) * 112} stroke={T.line} strokeDasharray="3 4" strokeWidth="1" />}
          {days.map((d, i) => {
            const list = byDay[d];
            const prodM = list.filter((s) => s.film !== "study" && s.film !== "tarea").reduce((a, s) => a + (s.minutes || 0), 0);
            const studyM = list.filter((s) => s.film === "study").reduce((a, s) => a + (s.minutes || 0), 0);
            const hTot = (prodM + studyM) / 60;
            const x = i * 30 + 5;
            const ph = (prodM / maxMin) * 112, sh = (studyM / maxMin) * 112;
            const isToday = d === today;
            const label = view === "week" ? DIAS[i] : (i === 0 || (i + 1) % 7 === 0 || i === days.length - 1 ? String(i + 1) : "");
            return (
              <g key={d}>
                <title>{`${d}: ${hTot.toFixed(1)}h`}</title>
                <text x={x + 10} y={12} fill={isToday ? T.accent : T.faint} fontSize="10" textAnchor="middle" fontFamily={BODY} letterSpacing="1">{label}</text>
                {prodM + studyM === 0 && <rect x={x} y={138} width="20" height="2" fill={T.lineSoft} rx="1" />}
                <rect x={x} y={140 - ph} width="20" height={ph} fill={T.accent} rx="2" />
                <rect x={x} y={140 - ph - sh} width="20" height={sh} fill={T.accentDim} rx="2" />
                {hTot > 0 && <text x={x + 10} y={158} fill={T.dim} fontSize="10" textAnchor="middle" fontFamily={BODY}>{hTot.toFixed(1)}</text>}
              </g>
            );
          })}
        </svg>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.dim, marginTop: 6 }}>
          <span><span style={{ display: "inline-block", width: 9, height: 9, background: T.accent, borderRadius: 2, marginRight: 6 }} />produccion</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, background: T.accentDim, borderRadius: 2, marginRight: 6 }} />study</span>
        </div>
      </div>

      {/* totales del mes en curso */}
      <div style={{ ...card, padding: "18px 26px", display: "flex", flexWrap: "wrap", gap: "8px 28px", alignItems: "baseline" }}>
        <span style={kicker}>{MESES[new Date().getMonth()]}</span>
        <span style={{ fontSize: 14, color: T.dim }}><b style={{ color: T.text, fontFamily: DISPLAY, fontSize: 18 }}>{monthTotals.prod.toFixed(1)}h</b> produccion</span>
        <span style={{ fontSize: 14, color: T.dim }}><b style={{ color: T.text, fontFamily: DISPLAY, fontSize: 18 }}>{monthTotals.study.toFixed(1)}h</b> study</span>
        <span style={{ fontSize: 14, color: T.dim }}><b style={{ color: T.text, fontFamily: DISPLAY, fontSize: 18 }}>{monthTotals.tarea.toFixed(1)}h</b> tareas</span>
        <span style={{ fontSize: 14, color: T.dim }}><b style={{ color: T.text, fontFamily: DISPLAY, fontSize: 18 }}>{monthTotals.dias}</b> dias activos</span>
      </div>
    </>
  );
}

// ================== VISTA PUBLICA (sin login): agregados ==================
function PublicStats() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    supabase.from("public_stats").select("*").order("date", { ascending: true }).limit(40)
      .then(({ data, error }) => { if (error) setErr(true); else setRows(data || []); });
  }, []);

  const today = localDateStr(new Date());
  const wkStart = mondayOf(today);
  const latest = rows && rows.length ? rows[rows.length - 1] : null;
  const weekH = rows ? rows.filter((r) => r.date >= wkStart).reduce((a, r) => a + r.work_min + r.study_min, 0) / 60 : 0;
  const chart = rows ? rows.slice(-30) : [];
  const maxMin = Math.max(300, ...chart.map((r) => r.work_min + r.study_min));

  if (err) return <p style={{ color: T.dim }}>No se pudieron cargar las estadisticas.</p>;
  if (rows === null) return <p style={{ color: T.faint }}>Cargando…</p>;
  if (!rows.length) return <p style={{ color: T.dim }}>Sin datos publicados todavia.</p>;

  return (
    <>
      <div className="statgrid" style={{ marginBottom: 12 }}>
        <StatCard label="Racha" value={`${latest.streak}`} sub={latest.streak === 1 ? "dia seguido" : "dias seguidos"} />
        <StatCard label="Esta semana" value={weekH.toFixed(1)} sub="horas de 35 planificadas" extra={
          <div style={{ marginTop: 12, height: 3, background: T.lineSoft, borderRadius: 2 }}>
            <div style={{ width: `${Math.min(100, (weekH / 35) * 100)}%`, height: "100%", background: T.accent, borderRadius: 2 }} />
          </div>
        } />
        <StatCard label="Films" value={`${latest.films_done}`} sub={`terminados · ${latest.footage_min} min de metraje`} />
        {latest.cycle_film ? <StatCard label="Ciclo actual" value={`${latest.cycle_step ?? 0}/15`} sub={`${latest.cycle_film} · dia ${latest.cycle_days ?? 1}`} /> : <StatCard label="Ciclo actual" value="—" sub="sin film activo" />}
      </div>
      <div style={{ ...card, padding: "26px 26px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          <div style={kicker}>Horas por dia · ultimos 30 dias</div>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.dim }}>
            <span><span style={{ display: "inline-block", width: 9, height: 9, background: T.accent, borderRadius: 2, marginRight: 6 }} />produccion</span>
            <span><span style={{ display: "inline-block", width: 9, height: 9, background: T.accentDim, borderRadius: 2, marginRight: 6 }} />study</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${chart.length * 24} 150`} style={{ width: "100%", display: "block" }}>
          {chart.map((r, i) => {
            const wh = (r.work_min / maxMin) * 122, sh = (r.study_min / maxMin) * 122;
            const x = i * 24 + 4;
            return (
              <g key={r.date}>
                <title>{`${r.date}: ${((r.work_min + r.study_min) / 60).toFixed(1)}h`}</title>
                {r.work_min + r.study_min === 0 && <rect x={x} y={128} width="16" height="2" fill={T.lineSoft} rx="1" />}
                <rect x={x} y={130 - wh} width="16" height={wh} fill={T.accent} rx="2" />
                <rect x={x} y={130 - wh - sh} width="16" height={sh} fill={T.accentDim} rx="2" />
                {(i === 0 || i === chart.length - 1 || i % 7 === 0) && <text x={x + 8} y={146} fill={T.faint} fontSize="9" textAnchor="middle" fontFamily={BODY}>{r.date.slice(8)}/{r.date.slice(5, 7)}</text>}
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}

export default function StatsPage() {
  const [session, setSession] = useState(undefined);
  const [full, setFull] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session ?? null;
      setSession(s);
      if (s) {
        const { data: row } = await supabase.from("user_states").select("data").eq("user_id", s.user.id).maybeSingle();
        setFull(row?.data || {});
      }
    });
  }, []);

  const live = session && full ? agoLabel(new Date().toISOString()) : null; // logueado: siempre "ahora"

  if (session === undefined) return <Shell>{" "}<p style={{ color: T.faint }}>Cargando…</p></Shell>;
  if (session && full === null) return <Shell><p style={{ color: T.faint }}>Cargando…</p></Shell>;
  if (session) return <Shell live={null}><PrivateStats data={full} /></Shell>;
  return <Shell live={null}><PublicStats /></Shell>;
}
