import React, { useState, useEffect, useRef, useCallback } from "react";
import mago1 from "./src/assets/mago-1-aprendiz.png";
import mago2 from "./src/assets/mago-2-domador.png";
import mago3 from "./src/assets/mago-3-bardo.png";
import mago4 from "./src/assets/mago-4-alquimista.png";
import mago5 from "./src/assets/mago-5-director.png";
import mago6 from "./src/assets/mago-6-ultimate.png";
const MAGOS = [mago1, mago2, mago3, mago4, mago5, mago6];
import boxNormal from "./src/assets/box-clase-normal.png";
import boxActiva from "./src/assets/box-clase-activa.png";
import fondo from "./src/assets/fondo.jpeg";
import camara from "./src/assets/camara.png";

// ---------- tokens ----------
const C = {
  bg: "#2B1C4E", bgDeep: "#1C1136", surface: "#3A2A60", surface2: "#271847", line: "#4B3A78",
  frame: "#2C1D4E", frameHi: "#8B9A54", ink: "#160E28",
  gold: "#F5C33B", cyan: "#3FD9D9", magenta: "#FF5DA2", green: "#5FD16E",
  cream: "#F4EEDC", parch: "#E7DDBC", parchInk: "#7A6A3E", muted: "#A99AD6",
  danger: "#FF5D5D", zombie: "#9AB46A",
};
const PX = "'Press Start 2P',ui-monospace,monospace";
const MONO = "ui-monospace,'Cascadia Code','Roboto Mono',monospace";

// ---------- class ladder ----------
const CLASSES = [
  { name: "Aprendiz de Píxeles", min: 0, blurb: "Flacucho, sin gorro, con un palito. Todos empezamos acá.", robe: "#8E84C0", hat: "#5A5480" },
  { name: "Domador de Prompts", min: 300, blurb: "Le pusiste lentes de nerd y un báculo. El modelo te obedece.", robe: "#3E9BE0", hat: "#2C5C90" },
  { name: "Bardo del Render", min: 900, blurb: "Barba sabia y primera medalla. Tus historias emocionan.", robe: "#5BD66E", hat: "#34803F" },
  { name: "Alquimista del Montaje", min: 2000, blurb: "Empezaste a hacer fierro. Brazos de cortar timelines.", robe: "#A86BE0", hat: "#6E3BA8" },
  { name: "Director Hechicero", min: 4000, blurb: "Lentes de sol, pecho de medallas, swole confirmado.", robe: "#FF5DA2", hat: "#C13B78" },
  { name: "Ultimate AI Wizard", min: 7000, blurb: "Corona, músculos imposibles, aura dorada. Una bestia.", robe: "#FFC53D", hat: "#E0941F", glow: true },
];

const BRANCHES = [
  { id: "story", name: "Storytelling" },
  { id: "screen", name: "Screenwriting" },
  { id: "vstory", name: "Visual Storytelling" },
  { id: "prod", name: "Production Design" },
  { id: "cine", name: "Cinematography" },
  { id: "edit", name: "Editing" },
  { id: "post", name: "Post" },
];
const BRANCH_THRESHOLDS = [0, 50, 150, 350, 700, 1200];

const DEFAULT_BOSSES = [
  { id: "b1", label: "Un corto que haga llorar a un test-viewer", done: false },
  { id: "b2", label: "Plano-secuencia de 60s, sin cortes, consistencia perfecta de personaje", done: false },
  { id: "b3", label: "Una escena que funcione solo con sonido (mute el diálogo y se entiende)", done: false },
  { id: "b4", label: "Tu primer piloto completo (NOVA / Don Moko)", done: false },
  { id: "b5", label: "Tu primera IP licenciable", done: false },
];

// ---------- production pipeline (igual para todos los proyectos) ----------
// PHASES = fases de trabajo (se hacen sesiones, se chequean al avanzar)
const PHASES = [
  { id: "idea", name: "Idea", branch: "story" },
  { id: "writing", name: "Writing", branch: "screen" },
  { id: "storyboard", name: "Storyboard", branch: "vstory" },
  { id: "visual", name: "Visual Design", branch: "prod" },
  { id: "shots", name: "Shots", branch: "cine" },
  { id: "edit", name: "Edit", branch: "edit" },
  { id: "post", name: "Post", branch: "post" },
  { id: "review", name: "Review", branch: "edit" },
];
const FINAL_PHASE = "final"; // checkbox aparte en Piezas: marcar = film terminado
const PHASE_XP = 10;         // por fase de trabajo completada
const FINAL_BONUS = 50;      // al marcar Final
const emptyPhases = () => { const o = {}; PHASES.forEach((ph) => { o[ph.id] = false; }); o[FINAL_PHASE] = false; return o; };

// ---------- macro-etapas del boss de campaña ----------
const STAGES = [
  { id: "dev", name: "Development", phases: ["idea", "writing"], w: 20 },
  { id: "prepro", name: "Preproduction", phases: ["storyboard", "visual"], w: 20 },
  { id: "prod", name: "Production", phases: ["shots"], w: 60 },
  { id: "post", name: "Postproduction", phases: ["edit", "post", "review"], w: 40 },
];
const STAGE_TOTAL_W = 140;              // suma de w (referencia 10 min)
const HOURS_PER_DAY = 5;                // ritmo para calcular deadlines
const filmBudgetH = (min) => 20 + 12 * (min || 0); // 10min→140h, 5min→80h
const WEEK_GOAL_H = 35;                 // meta de horas foco / semana
const STUDY_GOAL_H = 4;                 // meta de study / semana

const STORAGE_KEY = "director-console-v1";
const EMPTY = { pieces: [], practice: [], bosses: DEFAULT_BOSSES, streak: { count: 0, lastDate: null }, activeTimer: null, weeks: [], weekMinutes: {}, campaigns: [], mainFilmId: null, notes: [] };

// migra piezas viejas al modelo actual
const OLD_PHASE_MAP = { idea: "idea", writing: "writing", audio: "storyboard", storyboard: "storyboard", visual: "visual", shots: "shots", edit: "edit", post: "post", review: "review", final: "final" };
function migratePiece(p) {
  const ph = emptyPhases();
  if (!p.phases) {
    if (p.status === "done") { PHASES.forEach((x) => { ph[x.id] = true; }); ph[FINAL_PHASE] = true; }
    else if (p.status === "wip") ["idea", "writing", "storyboard", "visual"].forEach((id) => { ph[id] = true; });
    else ph.idea = true;
    return { id: p.id, n: p.n, film: p.title || p.film || "Proyecto", phases: ph, minutes: p.minutes || 0, date: p.date || todayStr() };
  }
  const hadFinal = Object.prototype.hasOwnProperty.call(p.phases, "final");
  Object.keys(p.phases).forEach((old) => { const nu = OLD_PHASE_MAP[old]; if (p.phases[old] && nu && ph[nu] !== undefined) ph[nu] = true; });
  if (!hadFinal && p.phases.post) ph.final = true; // era de 7 fases: post significaba terminado
  return { ...p, phases: ph };
}
// migra ramas viejas de sesiones → skills nuevos
const OLD_BRANCH_MAP = { story: "story", dir: "vstory", edit: "edit", photo: "cine", sound: "post", act: "story", pipe: "cine" };
function migrateSession(s) {
  const validNew = BRANCHES.some((b) => b.id === s.branch);
  return validNew ? s : { ...s, branch: OLD_BRANCH_MAP[s.branch] || "story" };
}

// ---------- helpers / xp ----------
const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(a + "T00:00") - new Date(b + "T00:00")) / 864e5);
const fmtTime = (ts) => new Date(ts).toTimeString().slice(0, 5);
const phasesDone = (p) => PHASES.filter((x) => p.phases?.[x.id]).length;
const isFinal = (p) => !!p.phases?.[FINAL_PHASE];
const pieceXP = (p) => phasesDone(p) * PHASE_XP + (isFinal(p) ? FINAL_BONUS + p.minutes * 10 : 0);
const practiceXP = (p) => p.xp ?? 5;
const totalXP = (s) =>
  s.pieces.reduce((a, p) => a + pieceXP(p), 0) + s.practice.reduce((a, p) => a + practiceXP(p), 0);
const branchXP = (s, id) => {
  const fromPhases = s.pieces.reduce((a, p) => a + PHASES.filter((x) => x.branch === id && p.phases?.[x.id]).length * PHASE_XP, 0);
  const fromPractice = s.practice.filter((p) => p.branch === id).reduce((a, p) => a + practiceXP(p), 0);
  return fromPhases + fromPractice;
};
const branchLevel = (xp) => { let l = 0; BRANCH_THRESHOLDS.forEach((t, i) => { if (xp >= t) l = i; }); return l; };
const finishedMinutes = (s) => s.pieces.filter(isFinal).reduce((a, p) => a + p.minutes, 0);
const classIndex = (xp) => { let i = 0; CLASSES.forEach((c, k) => { if (xp >= c.min) i = k; }); return i; };

// estado / vitality (drives zombie decay)
function estadoFrom(streak) {
  if (!streak.lastDate) return { label: "NUEVO", decay: 0, mood: "Hacé tu primera sesión", color: C.cyan };
  const idle = daysBetween(todayStr(), streak.lastDate);
  if (idle <= 0) {
    const c = streak.count;
    if (c >= 5) return { label: "+3", decay: 0, mood: "EN LLAMAS 🔥", color: C.gold };
    if (c >= 3) return { label: "+2", decay: 0, mood: "Activo y fuerte", color: C.green };
    return { label: "+1", decay: 0, mood: "En marcha", color: C.green };
  }
  if (idle === 1) return { label: "+0", decay: 0, mood: "Tibio — registrá hoy", color: C.cyan };
  if (idle === 2) return { label: "0", decay: 1, mood: "Cansado, palideciendo…", color: C.muted };
  if (idle === 3) return { label: "-1", decay: 2, mood: "Zombificándose 🧟", color: C.zombie };
  if (idle === 4) return { label: "-2", decay: 2, mood: "Casi zombi…", color: C.zombie };
  return { label: "DEAD", decay: 3, mood: "ZOMBI TOTAL 🧟 ¡revivilo con una sesión!", color: C.danger };
}

// ---------- wizard (imagen ilustrada por clase; decay = filtro zombie) ----------
// filtros CSS que simulan el deterioro "zombie" sin arte extra por nivel
const DECAY_FILTER = [
  "none",
  "saturate(.82) brightness(.96)",
  "sepia(.35) saturate(.6) hue-rotate(35deg) brightness(.9)",
  "sepia(.6) saturate(.5) hue-rotate(55deg) brightness(.82) contrast(1.05)",
];
function PixelWizard({ tier, decay = 0, size = 92 }) {
  const cfg = CLASSES[tier] || CLASSES[0];
  const glow = cfg.glow && decay === 0;
  return (
    <img
      src={MAGOS[tier] || MAGOS[0]}
      width={size}
      height={size}
      alt={cfg.name}
      draggable="false"
      style={{
        width: size, height: size, objectFit: "contain", display: "block",
        filter: `${DECAY_FILTER[Math.min(decay, 3)]}${glow ? ` drop-shadow(0 0 10px ${C.gold}aa)` : ""}`,
        transition: "filter .3s",
      }}
    />
  );
}

function SegBar({ pct, color, blocks = 20 }) {
  const filled = Math.round((pct / 100) * blocks);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: blocks }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 11, background: i < filled ? color : C.surface2, boxShadow: i < filled ? `0 0 5px ${color}88` : "none" }} />
      ))}
    </div>
  );
}
const panel = (e = {}) => ({ background: C.surface, border: `4px solid ${C.frame}`, boxShadow: `0 0 0 3px ${C.ink}, 0 5px 0 rgba(0,0,0,.30)`, ...e, borderRadius: e.borderRadius === 0 ? 12 : (e.borderRadius ?? 12) });
// caja dibujada a mano — imagen completa escalada (cuadrado→cuadrado, sin deformar el trazo)
const box9 = (active) => ({
  backgroundImage: `url(${active ? boxActiva : boxNormal})`,
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
  border: "none",
});
// parchment / aged-paper surface for scroll-style cards
const parch = (e = {}) => ({ background: C.parch, color: "#3A2E12", border: `4px solid ${C.parchInk}`, boxShadow: `0 0 0 3px ${C.ink}, 0 5px 0 rgba(0,0,0,.30)`, borderRadius: 10, ...e, backgroundImage: "repeating-linear-gradient(0deg, rgba(122,106,62,.06) 0 1px, transparent 1px 3px)" });

export default function ArcadeConsole({ onLogout, userEmail } = {}) {
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("clases");
  const [showPiece, setShowPiece] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [finishing, setFinishing] = useState(null);
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get(STORAGE_KEY); if (r && r.value) { const d = JSON.parse(r.value);
        // migra campaña única vieja -> lista + principal
        let campaigns = d.campaigns; let mainFilmId = d.mainFilmId;
        if (!campaigns) { campaigns = d.campaign ? [d.campaign] : []; mainFilmId = d.campaign ? d.campaign.filmId : null; }
        setState({ ...EMPTY, ...d, campaigns, mainFilmId, pieces: (d.pieces || []).map(migratePiece), practice: (d.practice || []).map(migrateSession), bosses: d.bosses?.length ? d.bosses : DEFAULT_BOSSES }); } }
      catch (e) { } finally { setLoading(false); }
    })();
  }, []);
  useEffect(() => { if (!state.activeTimer) return; const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, [state.activeTimer]);

  const persist = useCallback(async (next) => {
    setState(next);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(next)); setErr(null); }
    catch (e) { setErr("No se pudo guardar. Reintentá."); }
  }, []);

  if (loading) return <div style={{ minHeight: "100vh", background: C.bg, color: C.muted, fontFamily: PX, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>CARGANDO…</div>;

  const xp = totalXP(state);
  const idx = classIndex(xp);
  const cls = CLASSES[idx];
  const nxt = CLASSES[idx + 1] || null;
  const mins = finishedMinutes(state);
  const donePieces = state.pieces.filter(isFinal).length;
  const pct = nxt ? Math.round(((xp - cls.min) / (nxt.min - cls.min)) * 100) : 100;
  const est = estadoFrom(state.streak);
  const wkStartCur = mondayOf(todayStr());
  const wkSessCur = state.practice.filter((s) => s.date >= wkStartCur);
  const wkFocusH = wkSessCur.reduce((a, s) => a + (s.minutes || 0), 0) / 60;
  const wkStudyH = wkSessCur.filter((s) => s.film === "study").reduce((a, s) => a + (s.minutes || 0), 0) / 60;
  const goalsMet = (wkFocusH >= WEEK_GOAL_H ? 1 : 0) + (wkStudyH >= STUDY_GOAL_H ? 1 : 0);

  // ----- streak / session core -----
  const bumpStreak = (streak, date) => {
    if (date !== todayStr() || streak.lastDate === date) return streak;
    return { count: streak.lastDate === yesterdayStr() ? streak.count + 1 : 1, lastDate: date };
  };
  const addSession = (partial) => {
    const date = partial.date || todayStr();
    const streak = bumpStreak(state.streak, date);
    const eff = date === todayStr() ? streak.count : 1;
    const bonus = Math.min(Math.max(eff - 1, 0), 6);
    const entry = { id: Date.now(), date, start: partial.start || "", end: partial.end || "", minutes: partial.minutes || 0, film: partial.film ?? null, phase: partial.phase ?? null, branch: partial.branch, intencion: partial.intencion || "", resultado: partial.resultado || "", xp: 5 + bonus };
    persist({ ...state, practice: [...state.practice, entry], streak, activeTimer: null });
    setFinishing(null); setShowSession(false);
  };
  const startTimer = ({ film, phase, branch, note, duration }) => { persist({ ...state, activeTimer: { startTs: Date.now(), durationMin: duration, film, phase, branch, note } }); setShowSession(false); };
  const cancelTimer = () => persist({ ...state, activeTimer: null });
  const finishTimer = () => {
    const at = state.activeTimer; if (!at) return;
    const m = Math.min(at.durationMin, Math.max(1, Math.round((Date.now() - at.startTs) / 60000)));
    setFinishing({ film: at.film, phase: at.phase, branch: at.branch, intencion: at.note, minutes: m, start: fmtTime(at.startTs), end: fmtTime(Date.now()) });
    persist({ ...state, activeTimer: null });
  };

  const addProject = ({ film, minutes }) => {
    persist({ ...state, pieces: [...state.pieces, { id: Date.now(), n: state.pieces.length + 1, date: todayStr(), film, phases: emptyPhases(), minutes: minutes || 0 }] });
    setShowPiece(false);
  };
  const togglePhase = (id, phaseId) => {
    let streak = state.streak;
    const pieces = state.pieces.map((p) => {
      if (p.id !== id) return p;
      const phases = { ...p.phases, [phaseId]: !p.phases[phaseId] };
      if (phaseId === FINAL_PHASE && phases[FINAL_PHASE]) streak = bumpStreak(streak, todayStr()); // terminar cuenta como actividad
      return { ...p, phases };
    });
    persist({ ...state, pieces, streak });
  };
  const setProjectMinutes = (id, minutes) => persist({ ...state, pieces: state.pieces.map((p) => p.id === id ? { ...p, minutes } : p) });
  const setWeekMinutes = (weekStart, min) => persist({ ...state, weekMinutes: { ...state.weekMinutes, [weekStart]: min } });
  const closeWeek = (snap) => {
    const others = (state.weeks || []).filter((w) => w.weekStart !== snap.weekStart);
    persist({ ...state, weeks: [...others, snap].sort((a, b) => b.weekStart.localeCompare(a.weekStart)) });
  };
  const removePiece = (id) => persist({ ...state, pieces: state.pieces.filter((p) => p.id !== id).map((p, i) => ({ ...p, n: i + 1 })) });
  const activateCampaign = (filmId) => {
    if (state.campaigns.some((c) => c.filmId === filmId)) return;
    const campaigns = [...state.campaigns, { filmId, start: todayStr() }];
    persist({ ...state, campaigns, mainFilmId: state.mainFilmId ?? filmId });
  };
  const deactivateCampaign = (filmId) => {
    const campaigns = state.campaigns.filter((c) => c.filmId !== filmId);
    const mainFilmId = state.mainFilmId === filmId ? (campaigns[0]?.filmId ?? null) : state.mainFilmId;
    persist({ ...state, campaigns, mainFilmId });
  };
  const setMainCampaign = (filmId) => persist({ ...state, mainFilmId: filmId });
  const addNote = (text, filmId = null, title = "") => persist({ ...state, notes: [{ id: Date.now(), title, text, date: todayStr(), filmId, pinned: false }, ...(state.notes || [])] });
  const removeNote = (id) => persist({ ...state, notes: (state.notes || []).filter((n) => n.id !== id) });
  const editNote = (id, text, title = "") => persist({ ...state, notes: (state.notes || []).map((n) => n.id === id ? { ...n, text, title } : n) });
  const togglePinNote = (id) => persist({ ...state, notes: (state.notes || []).map((n) => n.id === id ? { ...n, pinned: !n.pinned } : n) });

  const at = state.activeTimer;
  const remaining = at ? at.startTs + at.durationMin * 60000 - Date.now() : 0;
  const rmm = Math.max(0, Math.floor(remaining / 60000));
  const rss = Math.max(0, Math.floor((remaining % 60000) / 1000));

  const TABS = [["clases", "CLASES"], ["panel", "SKILLS"], ["log", "BITÁCORA"], ["pieces", "PIEZAS"], ["logros", "NOTAS"], ["boss", "BOSSES"]];
  const NAV = [
    ["clases", "Dashboard", "▤"], ["log", "Sesiones", "◷"], ["pieces", "Films", "▶"],
    ["clases", "Clases", "★"], ["panel", "Skills", "✦"], ["log", "Bitácora", "▦"],
    ["pieces", "Piezas", "◧"], ["logros", "Notas", "▲"], ["boss", "Bosses", "☠"],
    ["tienda", "Tienda", "◆"], ["ajustes", "Ajustes", "⚙"],
  ];
  const recent = [...state.practice].sort((a, b) => (b.date + (b.start || "")).localeCompare(a.date + (a.start || ""))).slice(0, 30);

  return (
    <div style={{ minHeight: "100vh", color: C.cream, fontFamily: MONO, backgroundImage: `linear-gradient(rgba(20,12,40,.55), rgba(20,12,40,.7)), url(${fondo})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        *{box-sizing:border-box;} button{font-family:${PX};}
        button:focus-visible{outline:3px solid ${C.gold};outline-offset:2px;}
        .scan::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0 2px,transparent 2px 4px);}
        @keyframes blink{50%{opacity:.25;}} .blink{animation:blink 1s steps(1) infinite;}
        @keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        .logo-slime{font-family:${PX};color:${C.green};line-height:1.35;letter-spacing:.5px;text-shadow:0 2px 0 ${C.ink},2px 0 0 ${C.ink},-2px 0 0 ${C.ink},0 -2px 0 ${C.ink},2px 2px 0 ${C.ink},-2px 2px 0 ${C.ink},3px 5px 0 ${C.magenta},0 6px 0 rgba(0,0,0,.4);}
        .cartoon-btn{border-radius:12px;transition:transform .08s,box-shadow .08s;}
        .cartoon-btn:active{transform:translateY(3px);}
        .navbtn{border-radius:10px;transition:background .12s,color .12s;}
        @media (prefers-reduced-motion: reduce){.blink,[style*=floaty]{animation:none;}}
        /* ===== escritorio: contenedor centrado, más ancho, sin sidebar ===== */
        .shell{display:block;max-width:1040px;margin:0 auto;padding:18px;}
        .herorow{display:block;}
        .contentrow{display:block;margin-top:18px;}
        .classgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
        .railcol{display:none;}
        @media(max-width:820px){.classgrid{grid-template-columns:repeat(3,1fr);}}
        @media(max-width:720px){
          .shell{max-width:460px;padding:12px;}
          .classgrid{grid-template-columns:repeat(2,1fr);}
        }
      `}</style>

      <div className="shell">
        {/* ===== MAIN (sin sidebar; se navega por pestañas) ===== */}
        <main>
          {/* topbar: logo + gemas + avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span className="logo-slime" style={{ fontSize: 12, flex: 1, lineHeight: 1.3 }}>AI FILMMAKER<br/>QUEST</span>
            <span style={{ fontSize: 15, color: C.muted }}>🔔</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: PX, fontSize: 9, color: C.gold, border: `3px solid ${C.ink}`, borderRadius: 10, background: C.surface, padding: "7px 11px", boxShadow: `0 3px 0 rgba(0,0,0,.35)` }}>◆ 0</span>
            <div title={userEmail || ""} style={{ width: 38, height: 38, border: `3px solid ${C.ink}`, borderRadius: 10, background: C.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: `0 3px 0 rgba(0,0,0,.35)` }}><PixelWizard tier={idx} decay={est.decay} size={30} /></div>
            {onLogout && <button onClick={onLogout} title="Cerrar sesión" style={{ fontFamily: PX, fontSize: 8, color: C.muted, background: C.surface, border: `3px solid ${C.ink}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", boxShadow: `0 3px 0 rgba(0,0,0,.35)` }}>SALIR</button>}
          </div>

          {/* HERO ROW */}
          <div className="herorow">
            <div style={{ ...panel({ borderRadius: 0, borderColor: est.decay >= 2 ? C.zombie : C.frame }), position: "relative", padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ flexShrink: 0, background: C.bg, border: `2px solid ${cls.glow && est.decay === 0 ? C.gold : C.line}`, padding: 4, boxShadow: cls.glow && est.decay === 0 ? `0 0 16px ${C.gold}66` : "none" }}>
                <PixelWizard tier={idx} decay={est.decay} size={100} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: PX, fontSize: 9, color: C.cyan, marginBottom: 8 }}>RANGO · LVL {idx + 1}</div>
                <div style={{ fontFamily: PX, fontSize: cls.name.length > 22 ? 12 : 15, color: C.cream, lineHeight: 1.4 }}>{cls.name}</div>
                <div style={{ display: "inline-block", marginTop: 11, fontFamily: PX, fontSize: 8, color: C.bg, background: est.color, padding: "5px 8px" }}>ESTADO {est.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: est.decay >= 2 ? C.zombie : C.muted, marginTop: 9 }}>{est.mood}</div>
              </div>
              <div style={{ ...parch(), padding: "10px 18px", textAlign: "center", transform: "rotate(-1deg)", flexShrink: 0, alignSelf: "center" }}>
                <div style={{ fontFamily: PX, fontSize: 7, color: C.parchInk }}>XP TOTAL</div>
                <div style={{ fontFamily: PX, fontSize: 17, color: "#B8860B", margin: "6px 0 4px" }}>{xp}</div>
                <div style={{ fontFamily: PX, fontSize: 7, color: "#7A5A16" }}>NIVEL {idx + 1}</div>
              </div>
            </div>

          </div>

          {/* METRAJE + STATS */}
          <div style={{ ...panel({ borderRadius: 0 }), padding: 14, marginTop: 12, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "1 1 210px", minWidth: 0 }}>
              <img src={camara} alt="" width={56} height={56} draggable="false" style={{ flexShrink: 0, imageRendering: "auto" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: PX, fontSize: 8, color: C.muted }}>METRAJE</span>
                  <span className="blink" style={{ fontFamily: PX, fontSize: 8, color: C.danger }}>● REC</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                  <span style={{ fontFamily: PX, fontSize: 30, color: C.gold, textShadow: `0 0 10px ${C.gold}55` }}>{String(mins).padStart(3, "0")}</span>
                  <span style={{ fontFamily: PX, fontSize: 9, color: C.muted }}>MIN</span>
                  <span style={{ marginLeft: "auto", fontFamily: PX, fontSize: 9, color: C.cyan }}>{donePieces} FILMS</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flex: "2 1 340px" }}>
              <Stat label="RACHA" value={`${state.streak.count}d`} sub={state.streak.count > 0 ? "DÍAS" : "HOY"} c={C.magenta} />
              <Stat label="SESIONES" value={state.practice.length} sub="TOTALES" c={C.cyan} />
              <Stat label="GOALS" value={`${goalsMet}/2`} sub="CONSTANCIA" c={C.green} />
            </div>
          </div>

        {/* TIMER PANEL */}
        {at && (
          <div style={{ ...panel({ borderRadius: 0, borderColor: C.cyan }), padding: 16, marginTop: 10, textAlign: "center" }}>
            <div style={{ fontFamily: PX, fontSize: 8, color: C.cyan }}>{at.film && at.film !== "study" ? `${state.pieces.find((p) => p.id === at.film)?.film || "FILM"} · ${PHASES.find((x) => x.id === at.phase)?.name || ""}` : `STUDY · ${BRANCHES.find((b) => b.id === at.branch)?.name || ""}`}</div>
            <div style={{ fontFamily: PX, fontSize: 38, color: remaining <= 0 ? C.green : C.cream, margin: "12px 0", textShadow: `0 0 12px ${C.cyan}55` }}>{String(rmm).padStart(2, "0")}:{String(rss).padStart(2, "0")}</div>
            {at.note && <div style={{ fontFamily: MONO, fontSize: 12.5, color: C.muted, marginBottom: 12, fontStyle: "italic" }}>"{at.note}"</div>}
            {remaining <= 0 && <div style={{ fontFamily: PX, fontSize: 8, color: C.green, marginBottom: 12 }}>¡TIEMPO! Terminá para guardar.</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn c={C.green} onClick={finishTimer}>TERMINAR</Btn>
              <button onClick={cancelTimer} style={{ flex: 1, padding: 13, fontSize: 10, background: "none", border: `2px solid ${C.line}`, color: C.muted, cursor: "pointer" }}>DESCARTAR</button>
            </div>
            <p style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted, marginTop: 10 }}>Mantené esta pantalla abierta: el reloj no corre de fondo si cerrás la app.</p>
          </div>
        )}

        {/* FINISHING — resultado */}
        {finishing && (
          <FinishForm finishing={finishing} onSave={(res) => addSession({ ...finishing, resultado: res })} onSkip={() => addSession(finishing)} />
        )}

        {/* actions */}
        {!at && !finishing && (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn onClick={() => { setShowSession((v) => !v); setShowPiece(false); }} active={showSession} c={C.cyan}>+ NUEVA SESION</Btn>
            <Btn onClick={() => { setShowPiece((v) => !v); setShowSession(false); }} active={showPiece} c={C.gold}>+ NUEVO FILM</Btn>
          </div>
        )}
        {showSession && !at && <SessionForm onStart={startTimer} onManual={addSession} onCancel={() => setShowSession(false)} streak={state.streak.count} films={state.pieces} />}
        {showPiece && <ProjectForm onAdd={addProject} onCancel={() => setShowPiece(false)} existing={state.pieces.map((p) => p.film)} />}
        {err && <div style={{ marginTop: 10, color: C.danger, fontFamily: MONO, fontSize: 12 }}>{err}</div>}

        {/* CONTENT ROW: tabs+content | rail */}
        <div className="contentrow">
          <div>
            {/* tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {TABS.map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{ flex: "1 1 15%", padding: "10px 2px", cursor: "pointer", fontSize: 8, borderRadius: 9, background: tab === id ? C.magenta : C.surface, color: tab === id ? C.ink : C.muted, border: `2px solid ${tab === id ? C.ink : C.line}`, fontWeight: tab === id ? 700 : 400, boxShadow: tab === id ? `0 3px 0 rgba(0,0,0,.35)` : "none" }}>{label}</button>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              {tab === "clases" && <div className="classgrid">{CLASSES.map((c, k) => {
                const un = idx >= k, cur = idx === k;
                const nameCol = cur ? "#2E2410" : (un ? C.cream : C.muted);
                const blurbCol = cur ? "#5A4A22" : C.muted;
                const lvlCol = cur ? "#8A5A0A" : C.cyan;
                return (
                  <div key={k} style={{ ...box9(cur), position: "relative", padding: 26, aspectRatio: "1 / 1", overflow: "hidden", filter: `drop-shadow(0 5px 6px rgba(0,0,0,.5))${un ? "" : " brightness(.82)"}`, display: "flex", flexDirection: "column" }}>
                    {cur && <span style={{ position: "absolute", top: 20, right: 20, fontFamily: PX, fontSize: 6.5, color: C.cream, background: "#C13B78", padding: "2px 4px", borderRadius: 4 }}>AQUÍ</span>}
                    <div style={{ fontFamily: PX, fontSize: 7, color: lvlCol, lineHeight: 1.3, textAlign: "center" }}>LVL {k + 1} · {c.min} XP</div>
                    <div style={{ fontFamily: PX, fontSize: c.name.length > 22 ? 7.5 : 9, color: nameCol, lineHeight: 1.35, margin: "6px 0 4px", textAlign: "center" }}>{c.name}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center", flex: 1, minHeight: 0, textAlign: "center" }}>
                      <div style={{ flexShrink: 0, filter: un ? "none" : "grayscale(1) brightness(.55)" }}><PixelWizard tier={k} decay={0} size={86} /></div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: blurbCol, lineHeight: 1.25, overflow: "hidden" }}>{c.blurb}</div>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      {cur ? <div style={{ background: C.gold, color: C.ink, fontFamily: PX, fontSize: 7, textAlign: "center", padding: "6px", borderRadius: 6, border: `2px solid ${C.ink}` }}>ESTÁS ACÁ</div>
                        : un ? <div style={{ border: `2px solid ${C.green}`, color: C.green, fontFamily: PX, fontSize: 7, textAlign: "center", padding: "5px", borderRadius: 6 }}>✓ DESBLOQUEADA</div>
                          : <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textAlign: "center" }}>🔒 Bloqueada</div>}
                    </div>
                  </div>
                );
              })}
              {/* 2 clases futuras bloqueadas (personaje oculto) */}
              {[0, 1].map((m) => (
                <div key={`lock${m}`} style={{ ...box9(false), padding: 26, aspectRatio: "1 / 1", overflow: "hidden", filter: "drop-shadow(0 5px 6px rgba(0,0,0,.5)) brightness(.75)", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, textAlign: "center" }}>LVL {7 + m} · ???</div>
                  <div style={{ fontFamily: PX, fontSize: 9, color: C.muted, lineHeight: 1.35, margin: "6px 0 4px", textAlign: "center" }}>???</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", justifyContent: "center", flex: 1, minHeight: 0, textAlign: "center" }}>
                    <div style={{ fontFamily: PX, fontSize: 40, color: C.line }}>?</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: C.muted, lineHeight: 1.25 }}>Nueva clase por desbloquear.</div>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, textAlign: "center" }}>🔒 Bloqueada</div>
                  </div>
                </div>
              ))}
              </div>}

          {tab === "panel" && (
            <div>
              {BRANCHES.map((b) => {
                const bxp = branchXP(state, b.id), lvl = branchLevel(bxp), cap = BRANCH_THRESHOLDS[Math.min(lvl + 1, 5)], floor = BRANCH_THRESHOLDS[lvl];
                const pp = lvl >= 5 ? 100 : Math.round(((bxp - floor) / (cap - floor)) * 100);
                const ph = PHASES.find((x) => x.branch === b.id);
                return (
                  <div key={b.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ fontFamily: MONO, fontSize: 12.5, color: C.cream }}>{b.name} {ph && <span style={{ color: C.muted, fontFamily: PX, fontSize: 7 }}>· {ph.name}</span>}</span>
                      <span style={{ fontFamily: PX, fontSize: 8, color: C.cyan }}>Lv{lvl}</span>
                    </div>
                    <SegBar pct={pp} color={C.gold} blocks={14} />
                  </div>
                );
              })}
              <p style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginTop: 14, lineHeight: 1.5 }}>Cada disciplina sube al completar su fase en un film, o al estudiarla directamente en una sesión de Study.</p>
            </div>
          )}

          {tab === "log" && (
            <BitacoraEval state={state} recent={recent} onSetWeekMinutes={setWeekMinutes} onCloseWeek={closeWeek} />
          )}

          {tab === "pieces" && (
            <div>
              {state.pieces.length === 0 && <p style={{ fontFamily: MONO, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>Sin films todavía. Tocá + FILM para arrancar un proyecto y avanzá sus fases con el tiempo. Cada fase suma XP; al completarlas marcás FINAL y los minutos van al metraje.</p>}
              {state.pieces.map((p) => {
                const phaseMin = {};
                state.practice.forEach((s) => { if (s.film === p.id && s.phase) phaseMin[s.phase] = (phaseMin[s.phase] || 0) + (s.minutes || 0); });
                return <ProjectCard key={p.id} p={p} phaseMin={phaseMin} onTogglePhase={(ph) => togglePhase(p.id, ph)} onMinutes={(m) => setProjectMinutes(p.id, m)} onRemove={() => removePiece(p.id)} />;
              })}
            </div>
          )}

          {tab === "boss" && (
            <BossTab state={state} onActivate={activateCampaign} onDeactivate={deactivateCampaign} onSetMain={setMainCampaign} onTogglePhase={togglePhase} />
          )}

          {tab === "logros" && (
            <NotesTab notes={state.notes || []} films={state.pieces} onAdd={addNote} onRemove={removeNote} onEdit={editNote} onTogglePin={togglePinNote} />
          )}

          {["tienda", "ajustes"].includes(tab) && (
            <div style={{ ...panel({ borderRadius: 0 }), padding: 24, textAlign: "center" }}>
              <div style={{ fontFamily: PX, fontSize: 11, color: C.gold, marginBottom: 12 }}>{tab === "tienda" ? "TIENDA" : "AJUSTES"}</div>
              <div style={{ fontFamily: MONO, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>Próximamente. Todavía no le dimos función a esta sección — la definimos más adelante.</div>
            </div>
          )}
            </div>
          </div>

        </div>
        </main>
      </div>
    </div>
  );
}

// ---------- subcomponents ----------
function Stat({ label, value, sub, c }) {
  return (
    <div style={{ ...panel({ borderRadius: 0 }), flex: 1, padding: "9px 8px", textAlign: "center" }}>
      <div style={{ fontFamily: PX, fontSize: 7, color: C.muted }}>{label}</div>
      <div style={{ fontFamily: PX, fontSize: 15, color: c, margin: "6px 0 4px", textShadow: `0 0 8px ${c}55` }}>{value}</div>
      <div style={{ fontFamily: PX, fontSize: 6, color: C.muted, lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}
function Btn({ children, onClick, active, c }) {
  return <button className="cartoon-btn" onClick={onClick} style={{ flex: 1, padding: 14, cursor: "pointer", fontSize: 10, border: `3px solid ${C.ink}`, color: C.ink, background: c, fontWeight: 700, boxShadow: active ? `0 2px 0 rgba(0,0,0,.4), 0 0 14px ${c}88` : `0 4px 0 rgba(0,0,0,.4)` }}>{children}</button>;
}
function Field({ label, children }) {
  return <label style={{ display: "block", marginBottom: 11 }}><span style={{ display: "block", fontFamily: PX, fontSize: 7, color: C.muted, marginBottom: 6 }}>{label}</span>{children}</label>;
}
const inputStyle = { width: "100%", background: C.bg, border: `2px solid ${C.line}`, color: C.cream, padding: "10px 11px", fontSize: 14, fontFamily: MONO, borderRadius: 0 };
function FormShell({ children, accent }) { return <div style={{ ...panel({ borderRadius: 0, borderColor: accent }), padding: 14, marginTop: 10 }}>{children}</div>; }

function SessionForm({ onStart, onManual, onCancel, streak, films }) {
  const [film, setFilm] = useState(films[0]?.id ?? "study"); // filmId | "study"
  const [phase, setPhase] = useState(PHASES[0].id);
  const [skill, setSkill] = useState(BRANCHES[0].id);
  const [note, setNote] = useState("");
  const [duration, setDuration] = useState("45");
  const [manual, setManual] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [start, setStart] = useState(new Date().toTimeString().slice(0, 5));
  const [mmin, setMmin] = useState("45");
  const bonus = Math.min(Math.max(streak, 0), 6);
  const isStudy = film === "study";
  const branch = isStudy ? skill : (PHASES.find((x) => x.id === phase)?.branch || "story");
  const payload = () => ({ film: isStudy ? "study" : film, phase: isStudy ? null : phase, branch });

  return (
    <FormShell accent={C.cyan}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button onClick={() => setManual(false)} style={{ flex: 1, padding: 9, fontSize: 8, border: `2px solid ${C.cyan}`, background: manual ? "transparent" : C.cyan, color: manual ? C.cyan : C.bg, cursor: "pointer" }}>FOCO AHORA</button>
        <button onClick={() => setManual(true)} style={{ flex: 1, padding: 9, fontSize: 8, border: `2px solid ${C.cyan}`, background: manual ? C.cyan : "transparent", color: manual ? C.bg : C.cyan, cursor: "pointer" }}>REGISTRO MANUAL</button>
      </div>

      <Field label="¿EN QUÉ TRABAJÁS?">
        <select style={inputStyle} value={film} onChange={(e) => setFilm(e.target.value)}>
          {films.map((f) => <option key={f.id} value={f.id} style={{ background: C.surface }}>{f.film}</option>)}
          <option value="study" style={{ background: C.surface }}>📚 Study (estudiar / referencia)</option>
        </select>
      </Field>

      {isStudy ? (
        <Field label="SKILL A ESTUDIAR"><select style={inputStyle} value={skill} onChange={(e) => setSkill(e.target.value)}>{BRANCHES.map((b) => <option key={b.id} value={b.id} style={{ background: C.surface }}>{b.name}</option>)}</select></Field>
      ) : (
        <Field label="FASE DEL FILM"><select style={inputStyle} value={phase} onChange={(e) => setPhase(e.target.value)}>{PHASES.map((x) => <option key={x.id} value={x.id} style={{ background: C.surface }}>{x.name}</option>)}</select></Field>
      )}

      <Field label="FOCO / INTENCIÓN"><input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} placeholder={isStudy ? "analizar el montaje de Whiplash" : "cortar la escena del corredor"} /></Field>

      {!manual ? (
        <>
          <Field label="DURACIÓN (MIN)"><input style={inputStyle} type="number" min="5" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
          <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted, margin: "0 0 11px" }}>Arranca el timer. Al terminar sumás +{5 + bonus} XP {bonus > 0 ? `(base 5 + ${bonus} racha 🔥)` : ""} a {BRANCHES.find((b) => b.id === branch)?.name}.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn c={C.cyan} onClick={() => onStart({ ...payload(), note: note.trim(), duration: Math.max(5, parseInt(duration) || 45) })}>▶ INICIAR FOCO</Btn>
            <button onClick={onCancel} style={{ flex: 1, padding: 13, fontSize: 10, background: "none", border: `2px solid ${C.line}`, color: C.muted, cursor: "pointer" }}>CANCELAR</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 11 }}>
            <div style={{ flex: 1 }}><Field label="FECHA"><input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field></div>
            <div style={{ flex: 1 }}><Field label="HORA"><input style={inputStyle} type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field></div>
          </div>
          <Field label="MINUTOS REALES"><input style={inputStyle} type="number" min="1" value={mmin} onChange={(e) => setMmin(e.target.value)} /></Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn c={C.cyan} onClick={() => onManual({ ...payload(), intencion: note.trim(), date, start, minutes: Math.max(1, parseInt(mmin) || 0) })}>REGISTRAR</Btn>
            <button onClick={onCancel} style={{ flex: 1, padding: 13, fontSize: 10, background: "none", border: `2px solid ${C.line}`, color: C.muted, cursor: "pointer" }}>CANCELAR</button>
          </div>
        </>
      )}
    </FormShell>
  );
}

function FinishForm({ finishing, onSave, onSkip }) {
  const [res, setRes] = useState("");
  return (
    <FormShell accent={C.green}>
      <div style={{ fontFamily: PX, fontSize: 8, color: C.green, marginBottom: 10 }}>SESIÓN HECHA · {finishing.minutes} MIN</div>
      <Field label="¿QUÉ LOGRASTE? (RESULTADO)"><input style={inputStyle} value={res} onChange={(e) => setRes(e.target.value)} placeholder="quedó el ritmo, falta sonido" autoFocus /></Field>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn c={C.green} onClick={() => onSave(res.trim())}>GUARDAR</Btn>
        <button onClick={onSkip} style={{ flex: 1, padding: 13, fontSize: 10, background: "none", border: `2px solid ${C.line}`, color: C.muted, cursor: "pointer" }}>SIN NOTA</button>
      </div>
    </FormShell>
  );
}

// ---------- evaluación: heatmap + semana + ratio + export ----------
const isoDate = (d) => d.toISOString().slice(0, 10);
const addDays = (dateStr, n) => { const d = new Date(dateStr + "T00:00"); d.setDate(d.getDate() + n); return isoDate(d); };
const weekdayMon = (dateStr) => (new Date(dateStr + "T00:00").getDay() + 6) % 7; // 0=Lun..6=Dom
function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00");
  d.setDate(d.getDate() - weekdayMon(dateStr));
  return isoDate(d);
}
const heatColor = (m) => {
  if (!m) return C.surface2;
  if (m < 60) return "#5A4A1E";   // hasta 1h
  if (m < 150) return "#9A7322";  // 1–2.5h
  if (m < 270) return "#D29A2C";  // 2.5–4.5h
  return C.gold;                  // ~5h+
};

function Heatmap({ minutesByDay, weeks = 13 }) {
  const days = weeks * 7;
  const today = new Date();
  const startPad = weekdayMon(isoDate(today)); // align so last col ends today
  const cells = [];
  for (let i = days - 1; i >= 0; i--) { const d = new Date(); d.setDate(today.getDate() - i); cells.push(isoDate(d)); }
  // pad front so first column starts on Monday
  const firstPad = weekdayMon(cells[0]);
  const grid = [...Array(firstPad).fill(null), ...cells];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateRows: "repeat(7, 1fr)", gridAutoFlow: "column", gridAutoColumns: "1fr", gap: 3 }}>
        {grid.map((date, i) => (
          <div key={i} title={date ? `${date}: ${minutesByDay[date] || 0} min` : ""} style={{ aspectRatio: "1", background: date ? heatColor(minutesByDay[date] || 0) : "transparent", border: date === isoDate(today) ? `1px solid ${C.cyan}` : "none" }} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontFamily: PX, fontSize: 6, color: C.muted }}>
        MENOS {[C.surface2, "#5A4A1E", "#9A7322", "#D29A2C", C.gold].map((c, i) => <span key={i} style={{ width: 9, height: 9, background: c, display: "inline-block" }} />)} MÁS
      </div>
    </div>
  );
}

function BitacoraEval({ state, recent, onSetWeekMinutes, onCloseWeek }) {
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const [minInput, setMinInput] = useState("");

  const minutesByDay = {};
  state.practice.forEach((s) => { minutesByDay[s.date] = (minutesByDay[s.date] || 0) + (s.minutes || 0); });

  const today = isoDate(new Date());
  const wkStart = mondayOf(today);
  const weeks = state.weeks || [];
  const weekMinutes = state.weekMinutes || {};

  // ---- stats de una lista de sesiones (una semana) ----
  const statsFor = (sessions) => {
    const focusMin = sessions.reduce((a, s) => a + (s.minutes || 0), 0);
    const studyMin = sessions.filter((s) => s.film === "study").reduce((a, s) => a + (s.minutes || 0), 0);
    const prodMin = focusMin - studyMin;
    const days = new Set(sessions.map((s) => s.date)).size;
    const films = {};
    sessions.forEach((s) => {
      if (s.film && s.film !== "study" && s.phase) {
        if (!films[s.film]) films[s.film] = { name: state.pieces.find((p) => p.id === s.film)?.film || "Film", phases: {}, total: 0 };
        films[s.film].phases[s.phase] = (films[s.film].phases[s.phase] || 0) + (s.minutes || 0);
        films[s.film].total += (s.minutes || 0);
      }
    });
    const study = {};
    sessions.filter((s) => s.film === "study").forEach((s) => { study[s.branch] = (study[s.branch] || 0) + (s.minutes || 0); });
    return { focusMin, studyMin, prodMin, days, films, study };
  };

  const wkSessions = state.practice.filter((s) => s.date >= wkStart);
  const w = statsFor(wkSessions);
  const focusH = w.focusMin / 60;
  const goalPct = Math.min(100, Math.round((focusH / WEEK_GOAL_H) * 100));
  const goalDiff = focusH - WEEK_GOAL_H;
  const minAdv = weekMinutes[wkStart] ?? 0;
  const weekRatio = minAdv > 0 ? (w.prodMin / 60 / minAdv).toFixed(1) : null;

  // costo real por film terminado (acumulado, todas las semanas)
  const finishedFilms = state.pieces.filter(isFinal).map((p) => {
    const h = state.practice.filter((s) => s.film === p.id).reduce((a, s) => a + (s.minutes || 0), 0) / 60;
    return { name: p.film, minutes: p.minutes, h, ratio: p.minutes > 0 ? (h / p.minutes).toFixed(1) : null };
  });

  const snapshot = () => ({ weekStart: wkStart, closedAt: new Date().toISOString(), focusMin: w.focusMin, studyMin: w.studyMin, prodMin: w.prodMin, days: w.days, minAdv, ratio: weekRatio, films: Object.values(w.films), study: w.study, sessions: wkSessions.length });

  const buildReport = () => {
    const L = [];
    L.push(`REPORTE AI FILMMAKER QUEST — ${today}`);
    L.push(`Racha: ${state.streak.count} días · XP total: ${totalXP(state)}`);
    L.push("");
    L.push(`== SEMANA EN CURSO (desde ${wkStart}) ==`);
    L.push(`Horas foco: ${focusH.toFixed(1)}h / meta ${WEEK_GOAL_H}h (${goalDiff >= 0 ? "+" : ""}${goalDiff.toFixed(1)}h)`);
    L.push(`Producción: ${(w.prodMin / 60).toFixed(1)}h · Study: ${(w.studyMin / 60).toFixed(1)}h · Días activos: ${w.days}/7`);
    L.push(`Minutos avanzados (cargados): ${minAdv} · Ratio semana (modo): ${weekRatio ? weekRatio + " h/min" : "semana base (sin metraje nuevo)"}`);
    L.push("Films de la semana:");
    Object.values(w.films).forEach((f) => { L.push(`  ${f.name} — ${(f.total / 60).toFixed(1)}h: ` + PHASES.filter((ph) => f.phases[ph.id]).map((ph) => `${ph.name} ${(f.phases[ph.id] / 60).toFixed(1)}h`).join(", ")); });
    if (Object.keys(w.study).length) L.push("Study: " + Object.entries(w.study).map(([k, m]) => `${BRANCHES.find((b) => b.id === k)?.name} ${(m / 60).toFixed(1)}h`).join(", "));
    L.push("");
    L.push("Sesiones de la semana:");
    wkSessions.slice().reverse().forEach((s) => {
      const ctx = s.film && s.film !== "study" ? `${state.pieces.find((p) => p.id === s.film)?.film || "Film"} / ${PHASES.find((x) => x.id === s.phase)?.name || "?"}` : `Study: ${BRANCHES.find((b) => b.id === s.branch)?.name || "?"}`;
      L.push(`  ${s.date} ${s.start || ""} · ${ctx} · ${s.minutes || 0}min → ${s.intencion || "(sin intención)"}${s.resultado ? ` ✓ ${s.resultado}` : ""}`);
    });
    L.push("");
    L.push("== COSTO REAL (films terminados) ==");
    finishedFilms.length ? finishedFilms.forEach((f) => L.push(`  ${f.name}: ${f.h.toFixed(1)}h / ${f.minutes}min = ${f.ratio || "—"} h/min`)) : L.push("  Aún no cerraste ningún film.");
    if (weeks.length) {
      L.push("");
      L.push("== SEMANAS CERRADAS (para comparar) ==");
      weeks.slice(0, 6).forEach((k) => L.push(`  ${k.weekStart}: ${(k.focusMin / 60).toFixed(1)}h foco · prod ${(k.prodMin / 60).toFixed(1)}h · study ${(k.studyMin / 60).toFixed(1)}h · avanzó ${k.minAdv}min · ratio ${k.ratio || "—"}`));
    }
    return L.join("\n");
  };
  const onExport = () => { const r = buildReport(); setReport(r); setCopied(false); try { navigator.clipboard?.writeText(r).then(() => setCopied(true)).catch(() => { }); } catch (e) { } };

  if (state.practice.length === 0 && weeks.length === 0)
    return <p style={{ fontFamily: MONO, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>Sin sesiones todavía. Tocá + SESIÓN para arrancar tu primer bloque de foco. Acá vas a ver el mapa de constancia, el resumen de la semana, y vas a poder cerrar la semana y exportarla para evaluarla juntos.</p>;

  const goalColor = goalPct >= 100 ? C.green : goalPct >= 60 ? C.gold : C.magenta;
  const prevWeek = weeks[0]; // más reciente cerrada, para comparar

  return (
    <div>
      {/* heatmap */}
      <div style={{ ...panel({ borderRadius: 0 }), padding: 12, marginBottom: 10 }}>
        <div style={{ fontFamily: PX, fontSize: 8, color: C.gold, marginBottom: 10 }}>CONSTANCIA · 13 SEMANAS</div>
        <Heatmap minutesByDay={minutesByDay} />
      </div>

      {/* meta 35h */}
      <div style={{ ...panel({ borderRadius: 0 }), padding: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontFamily: PX, fontSize: 8, color: C.cyan }}>SEMANA · META {WEEK_GOAL_H}H</span>
          <span style={{ fontFamily: PX, fontSize: 8, color: goalColor }}>{focusH.toFixed(1)}h</span>
        </div>
        <SegBar pct={goalPct} color={goalColor} />
        <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginTop: 7 }}>
          {goalDiff >= 0 ? `¡Meta cumplida! +${goalDiff.toFixed(1)}h sobre las ${WEEK_GOAL_H}.` : `Faltan ${(-goalDiff).toFixed(1)}h para la meta.`}
          {prevWeek && <> · vs. semana pasada: {(focusH - prevWeek.focusMin / 60) >= 0 ? "+" : ""}{(focusH - prevWeek.focusMin / 60).toFixed(1)}h</>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <MiniStat v={(w.prodMin / 60).toFixed(1) + "h"} l="PRODUCCIÓN" />
          <MiniStat v={(w.studyMin / 60).toFixed(1) + "h"} l="STUDY" />
          <MiniStat v={`${w.days}/7`} l="DÍAS" />
        </div>
      </div>

      {/* films de la semana por fase */}
      <div style={{ ...panel({ borderRadius: 0 }), padding: 12, marginBottom: 10 }}>
        <div style={{ fontFamily: PX, fontSize: 8, color: C.gold, marginBottom: 10 }}>FILMS DE LA SEMANA</div>
        {Object.keys(w.films).length ? Object.values(w.films).map((f, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12.5, color: C.cream, marginBottom: 5 }}><span>{f.name}</span><span style={{ color: C.cyan }}>{(f.total / 60).toFixed(1)}h</span></div>
            {PHASES.filter((ph) => f.phases[ph.id]).map((ph) => (
              <div key={ph.id} style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 11, color: C.muted, padding: "2px 0 2px 10px" }}><span>{ph.name}</span><span>{(f.phases[ph.id] / 60).toFixed(1)}h</span></div>
            ))}
          </div>
        )) : <p style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted }}>Ningún film trabajado esta semana todavía.</p>}
      </div>

      {/* study de la semana */}
      <div style={{ ...panel({ borderRadius: 0 }), padding: 12, marginBottom: 10 }}>
        <div style={{ fontFamily: PX, fontSize: 8, color: C.magenta, marginBottom: 10 }}>📚 STUDY DE LA SEMANA</div>
        {Object.keys(w.study).length ? Object.entries(w.study).sort((a, b) => b[1] - a[1]).map(([k, m]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12, color: C.cream, padding: "3px 0" }}><span>{BRANCHES.find((b) => b.id === k)?.name || k}</span><span style={{ color: C.cyan }}>{(m / 60).toFixed(1)}h</span></div>
        )) : <p style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted }}>No estudiaste esta semana. Si tampoco la anterior, ojo con eso.</p>}
      </div>

      {/* minutos avanzados + ratios */}
      <div style={{ ...panel({ borderRadius: 0 }), padding: 12, marginBottom: 10 }}>
        <div style={{ fontFamily: PX, fontSize: 8, color: C.gold, marginBottom: 10 }}>METRAJE Y RATIOS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontFamily: PX, fontSize: 7, color: C.muted, flex: 1 }}>MIN AVANZADOS ESTA SEMANA</span>
          <input type="number" min="0" step="0.5" value={weekMinutes[wkStart] ?? ""} placeholder="0" onChange={(e) => onSetWeekMinutes(wkStart, Math.max(0, parseFloat(e.target.value) || 0))}
            style={{ width: 80, background: C.bg, border: `2px solid ${C.line}`, color: C.cream, padding: "8px", fontSize: 14, fontFamily: MONO, borderRadius: 0, textAlign: "center" }} />
        </div>
        <div style={{ background: C.bg, border: `2px solid ${C.line}`, padding: 10, marginBottom: 8 }}>
          <div style={{ fontFamily: PX, fontSize: 7, color: C.cyan }}>RATIO SEMANA (modo)</div>
          <div style={{ fontFamily: MONO, fontSize: 12.5, color: C.cream, marginTop: 5 }}>{weekRatio ? `${weekRatio} h/min — semana de producción` : "Semana base (guion/diseño): sin metraje nuevo"}</div>
        </div>
        <div style={{ background: C.bg, border: `2px solid ${C.line}`, padding: 10 }}>
          <div style={{ fontFamily: PX, fontSize: 7, color: C.magenta }}>COSTO REAL (films terminados)</div>
          {finishedFilms.length ? finishedFilms.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12, color: C.cream, marginTop: 5 }}><span>{f.name}</span><span style={{ color: C.magenta }}>{f.ratio || "—"} h/min</span></div>
          )) : <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginTop: 5 }}>Aún no cerraste ningún film.</div>}
        </div>
        <p style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted, marginTop: 10 }}>El ratio semanal dice en qué modo estuviste (producir vs. base), no tu eficiencia. El costo real por film terminado sí mide rendimiento.</p>
      </div>

      {/* cerrar semana */}
      <button onClick={() => onCloseWeek(snapshot())} style={{ width: "100%", padding: 13, fontSize: 9, marginBottom: 10, border: `3px solid ${C.cyan}`, background: "transparent", color: C.cyan, cursor: "pointer" }}>▣ CERRAR Y ARCHIVAR SEMANA</button>

      {/* semanas cerradas */}
      {weeks.length > 0 && (
        <div style={{ ...panel({ borderRadius: 0 }), padding: 12, marginBottom: 10 }}>
          <div style={{ fontFamily: PX, fontSize: 8, color: C.cyan, marginBottom: 10 }}>SEMANAS CERRADAS</div>
          {weeks.slice(0, 8).map((k, i) => {
            const prev = weeks[i + 1];
            const dh = prev ? (k.focusMin - prev.focusMin) / 60 : null;
            return (
              <div key={k.weekStart} style={{ borderBottom: i < Math.min(weeks.length, 8) - 1 ? `1px solid ${C.line}` : "none", padding: "8px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: PX, fontSize: 7, color: C.muted }}>
                  <span>SEM {k.weekStart}</span>
                  <span style={{ color: C.gold }}>{(k.focusMin / 60).toFixed(1)}h{dh !== null ? ` (${dh >= 0 ? "+" : ""}${dh.toFixed(1)})` : ""}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 4 }}>prod {(k.prodMin / 60).toFixed(1)}h · study {(k.studyMin / 60).toFixed(1)}h · avanzó {k.minAdv}min · ratio {k.ratio || "—"}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* export */}
      <button onClick={onExport} style={{ width: "100%", padding: 13, fontSize: 9, marginBottom: 10, border: `3px solid ${C.green}`, background: "transparent", color: C.green, cursor: "pointer" }}>⤓ EXPORTAR PARA EVALUAR</button>
      {report && (
        <div style={{ ...panel({ borderRadius: 0, borderColor: C.green }), padding: 12, marginBottom: 10 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginBottom: 8 }}>{copied ? "✓ Copiado. " : ""}Copiá este texto y pegámelo en el chat para que analicemos los patrones.</div>
          <textarea readOnly value={report} onFocus={(e) => e.target.select()} style={{ width: "100%", minHeight: 160, background: C.bg, border: `2px solid ${C.line}`, color: C.cream, padding: 10, fontSize: 11, fontFamily: MONO, borderRadius: 0, resize: "vertical" }} />
        </div>
      )}

      {/* list */}
      <div style={{ fontFamily: PX, fontSize: 8, color: C.muted, margin: "4px 0 10px" }}>SESIONES RECIENTES</div>
      {recent.map((s) => {
        const film = s.film && s.film !== "study" ? state.pieces.find((p) => p.id === s.film) : null;
        const phaseName = PHASES.find((x) => x.id === s.phase)?.name;
        const skillName = BRANCHES.find((b) => b.id === s.branch)?.name;
        const label = film ? `${film.film} · ${phaseName || ""}` : (s.film === "study" ? `📚 Study · ${skillName || ""}` : (skillName || ""));
        return (
          <div key={s.id} style={{ ...panel({ borderRadius: 0 }), padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: PX, fontSize: 7, color: C.cyan }}>
              <span>{s.date}{s.start ? ` · ${s.start}${s.end ? `–${s.end}` : ""}` : ""}</span>
              <span style={{ color: C.muted }}>{s.minutes ? `${s.minutes}min` : ""} · +{s.xp}xp</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 12.5, color: C.cream, marginTop: 6 }}>{label}</div>
            {s.intencion && <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginTop: 3 }}>→ {s.intencion}</div>}
            {s.resultado && <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.green, marginTop: 3 }}>✓ {s.resultado}</div>}
          </div>
        );
      })}
    </div>
  );
}
function MiniStat({ v, l }) {
  return (
    <div style={{ flex: 1, background: C.bg, border: `2px solid ${C.line}`, padding: "8px 6px", textAlign: "center" }}>
      <div style={{ fontFamily: PX, fontSize: 13, color: C.cream }}>{v}</div>
      <div style={{ fontFamily: PX, fontSize: 6, color: C.muted, marginTop: 5 }}>{l}</div>
    </div>
  );
}

function ProjectForm({ onAdd, onCancel, existing }) {
  const [film, setFilm] = useState("");
  const [minutes, setMinutes] = useState("1");
  const dup = existing.some((f) => f.toLowerCase() === film.trim().toLowerCase());
  return (
    <FormShell accent={C.gold}>
      <Field label="NOMBRE DEL FILM / PROYECTO"><input style={inputStyle} value={film} onChange={(e) => setFilm(e.target.value)} placeholder="NOVA — Después (piloto)" autoFocus /></Field>
      <Field label="MINUTOS OBJETIVO (DURACIÓN FINAL)"><input style={inputStyle} type="number" min="0" step="0.5" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
      <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted, margin: "0 0 11px" }}>Creás el film una vez y vas marcando sus {PHASES.length} fases con el tiempo. Cada fase suma +{PHASE_XP} XP; al marcar FINAL cae +{FINAL_BONUS} y +10 por minuto.</p>
      {dup && <p style={{ fontFamily: MONO, fontSize: 11, color: C.danger, margin: "0 0 11px" }}>Ya tenés un film con ese nombre. Avanzá sus fases en la tarjeta existente, o usá otro nombre.</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn c={C.gold} onClick={() => { if (film.trim() && !dup) onAdd({ film: film.trim(), minutes: Math.max(0, parseFloat(minutes) || 0) }); }}>CREAR FILM</Btn>
        <button onClick={onCancel} style={{ flex: 1, padding: 13, fontSize: 10, background: "none", border: `2px solid ${C.line}`, color: C.muted, cursor: "pointer" }}>CANCELAR</button>
      </div>
    </FormShell>
  );
}

function BossTab({ state, onActivate, onDeactivate, onSetMain, onTogglePhase }) {
  // ----- goals de constancia (semana en curso) -----
  const wkStart = mondayOf(todayStr());
  const wk = state.practice.filter((s) => s.date >= wkStart);
  const focusH = wk.reduce((a, s) => a + (s.minutes || 0), 0) / 60;
  const studyH = wk.filter((s) => s.film === "study").reduce((a, s) => a + (s.minutes || 0), 0) / 60;

  const activeFilms = state.pieces.filter((p) => !isFinal(p));
  const campaigns = state.campaigns || [];
  const activatedIds = new Set(campaigns.map((c) => c.filmId));
  const notActivated = activeFilms.filter((p) => !activatedIds.has(p.id));
  const mainId = state.mainFilmId;
  const mainCamp = campaigns.find((c) => c.filmId === mainId);
  const mainFilm = mainCamp ? state.pieces.find((p) => p.id === mainCamp.filmId) : null;
  const secondaries = campaigns.filter((c) => c.filmId !== mainId);

  return (
    <div>
      {/* CONSTANCIA */}
      <div style={{ ...panel({ borderRadius: 0 }), padding: 12, marginBottom: 12 }}>
        <div style={{ fontFamily: PX, fontSize: 8, color: C.cyan, marginBottom: 12 }}>GOALS DE CONSTANCIA · SEMANA</div>
        <GoalBar label="35 h de foco" cur={focusH} goal={WEEK_GOAL_H} color={C.gold} />
        <GoalBar label="4 h de study" cur={studyH} goal={STUDY_GOAL_H} color={C.magenta} />
        <p style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted, marginTop: 6 }}>Se llenan solas con tus sesiones y se reinician cada lunes.</p>
      </div>

      {/* BOSS PRINCIPAL (con deadline) */}
      <div style={{ ...panel({ borderRadius: 0, borderColor: mainFilm ? C.gold : C.line }), padding: 12, marginBottom: 12 }}>
        <div style={{ fontFamily: PX, fontSize: 8, color: C.gold, marginBottom: 12 }}>🐉 BOSS PRINCIPAL</div>
        {mainFilm ? (
          <Campaign film={mainFilm} start={mainCamp.start} sessions={state.practice} onClear={() => onDeactivate(mainFilm.id)} />
        ) : (
          <p style={{ fontFamily: MONO, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            {activeFilms.length ? "Activá un film abajo para ponerlo como boss principal: despliega sus etapas con presupuesto de horas y fechas de cierre." : "Creá un film en PIEZAS para poder activar una campaña."}
          </p>
        )}
      </div>

      {/* EN PARALELO (sin deadline) */}
      {secondaries.length > 0 && (
        <div style={{ ...panel({ borderRadius: 0 }), padding: 12, marginBottom: 12 }}>
          <div style={{ fontFamily: PX, fontSize: 8, color: C.cyan, marginBottom: 4 }}>🎬 EN PARALELO</div>
          <p style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted, marginBottom: 12 }}>Films activos sin deadline. Registrás horas y ves progreso; cuando quieras, hacé principal a uno.</p>
          {secondaries.map((c) => {
            const film = state.pieces.find((p) => p.id === c.filmId);
            if (!film) return null;
            return <CampaignLite key={c.filmId} film={film} sessions={state.practice} onMakeMain={() => onSetMain(film.id)} onClear={() => onDeactivate(film.id)} onTogglePhase={(phaseId) => onTogglePhase(film.id, phaseId)} />;
          })}
        </div>
      )}

      {/* ACTIVAR MÁS FILMS */}
      {notActivated.length > 0 && (
        <div style={{ ...panel({ borderRadius: 0 }), padding: 12 }}>
          <div style={{ fontFamily: PX, fontSize: 8, color: C.muted, marginBottom: 12 }}>+ ACTIVAR FILM</div>
          {notActivated.map((p) => (
            <button key={p.id} onClick={() => onActivate(p.id)} style={{ width: "100%", textAlign: "left", padding: 12, marginBottom: 8, cursor: "pointer", fontFamily: MONO, fontSize: 13, color: C.cream, background: C.bg, border: `2px solid ${C.line}`, borderRadius: 8 }}>
              ▶ Activar: {p.film} <span style={{ color: C.muted, fontSize: 11 }}>({p.minutes} min → {filmBudgetH(p.minutes)}h)</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GoalBar({ label, cur, goal, color }) {
  const pct = Math.min(100, Math.round((cur / goal) * 100));
  const done = cur >= goal;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontFamily: MONO, fontSize: 12.5, color: C.cream }}>{done ? "✓ " : ""}{label}</span>
        <span style={{ fontFamily: PX, fontSize: 8, color: done ? C.green : color }}>{cur.toFixed(1)}/{goal}h</span>
      </div>
      <SegBar pct={pct} color={done ? C.green : color} blocks={14} />
    </div>
  );
}

// bloc de notas / recordatorios (general o por film; con pin y edición)
function NotesTab({ notes, films, onAdd, onRemove, onEdit, onTogglePin }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [scope, setScope] = useState("global"); // "global" | filmId
  const [filter, setFilter] = useState("all");   // "all" | "global" | filmId
  const [editing, setEditing] = useState(null);   // id en edición
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");

  const filmName = (id) => films.find((f) => f.id === id)?.film || "Film";
  const selStyle = { background: C.bg, border: `2px solid ${C.line}`, color: C.cream, padding: "8px 10px", fontSize: 12.5, fontFamily: MONO, borderRadius: 8 };
  const titleStyle = { width: "100%", background: C.bg, border: `2px solid ${C.line}`, color: C.cream, padding: "9px 11px", fontSize: 13, fontFamily: MONO, borderRadius: 8, marginBottom: 8, fontWeight: 700 };

  const submit = () => { const t = text.trim(); if (!t) return; onAdd(t, scope === "global" ? null : scope, title.trim()); setText(""); setTitle(""); };
  const startEdit = (n) => { setEditing(n.id); setEditText(n.text); setEditTitle(n.title || ""); };
  const saveEdit = () => { const t = editText.trim(); if (t) onEdit(editing, t, editTitle.trim()); setEditing(null); };

  const shown = notes
    .filter((n) => filter === "all" ? true : filter === "global" ? !n.filmId : n.filmId === filter)
    .slice()
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)); // fijadas arriba (estable)

  return (
    <div>
      {/* NUEVA NOTA */}
      <div style={{ ...panel({ borderRadius: 0 }), padding: 12, marginBottom: 12 }}>
        <div style={{ fontFamily: PX, fontSize: 8, color: C.gold, marginBottom: 10 }}>📝 NUEVA NOTA</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional)" style={titleStyle} />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ej: estructura del guion (setup → conflicto → clímax → resolución), checklist de rodaje, ideas sueltas…"
          rows={3}
          style={{ width: "100%", background: C.bg, border: `2px solid ${C.line}`, color: C.cream, padding: "10px 11px", fontSize: 13.5, fontFamily: MONO, borderRadius: 8, resize: "vertical", lineHeight: 1.5 }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: PX, fontSize: 7, color: C.muted }}>PARA:</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)} style={selStyle}>
            <option value="global">General</option>
            {films.map((f) => <option key={f.id} value={f.id}>🎬 {f.film}</option>)}
          </select>
          <button onClick={submit} style={{ marginLeft: "auto", padding: "10px 18px", fontFamily: PX, fontSize: 8, color: C.ink, background: C.gold, border: `2px solid ${C.ink}`, borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>+ GUARDAR</button>
        </div>
      </div>

      {/* FILTRO */}
      {notes.length > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontFamily: PX, fontSize: 7, color: C.muted }}>VER:</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={selStyle}>
            <option value="all">Todas</option>
            <option value="global">General</option>
            {films.map((f) => <option key={f.id} value={f.id}>🎬 {f.film}</option>)}
          </select>
        </div>
      )}

      {shown.length === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: 12.5, color: C.muted, lineHeight: 1.5, padding: "4px 2px" }}>{notes.length === 0 ? "Todavía no hay notas. Anotá recordatorios, estructuras, ideas — se quedan acá hasta que las borres." : "No hay notas en este filtro."}</p>
      ) : (
        shown.map((n) => (
          <div key={n.id} style={{ ...panel({ borderRadius: 0, borderColor: n.pinned ? C.gold : C.frame }), padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: PX, fontSize: 6.5, color: n.filmId ? C.cyan : C.muted, background: C.bg, border: `2px solid ${C.line}`, borderRadius: 5, padding: "3px 6px" }}>{n.filmId ? `🎬 ${filmName(n.filmId)}` : "GENERAL"}</span>
              {n.pinned && <span style={{ fontFamily: PX, fontSize: 6.5, color: C.gold }}>📌 FIJADA</span>}
              <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button onClick={() => onTogglePin(n.id)} title="Fijar/desfijar" style={{ fontFamily: PX, fontSize: 8, color: n.pinned ? C.gold : C.muted, background: "none", border: `2px solid ${C.line}`, borderRadius: 6, padding: "5px 7px", cursor: "pointer" }}>📌</button>
                {editing !== n.id && <button onClick={() => startEdit(n)} title="Editar" style={{ fontFamily: PX, fontSize: 8, color: C.cyan, background: "none", border: `2px solid ${C.line}`, borderRadius: 6, padding: "5px 7px", cursor: "pointer" }}>✎</button>}
                <button onClick={() => onRemove(n.id)} title="Borrar" style={{ fontFamily: PX, fontSize: 8, color: C.muted, background: "none", border: `2px solid ${C.line}`, borderRadius: 6, padding: "5px 7px", cursor: "pointer" }}>✕</button>
              </span>
            </div>

            {editing === n.id ? (
              <div>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título (opcional)" style={{ ...titleStyle, border: `2px solid ${C.cyan}` }} />
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} autoFocus style={{ width: "100%", background: C.bg, border: `2px solid ${C.cyan}`, color: C.cream, padding: "10px 11px", fontSize: 13.5, fontFamily: MONO, borderRadius: 8, resize: "vertical", lineHeight: 1.5 }} />
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
                  <button onClick={() => setEditing(null)} style={{ padding: "7px 12px", fontFamily: PX, fontSize: 7, color: C.muted, background: "none", border: `2px solid ${C.line}`, borderRadius: 6, cursor: "pointer" }}>CANCELAR</button>
                  <button onClick={saveEdit} style={{ padding: "7px 14px", fontFamily: PX, fontSize: 7, color: C.ink, background: C.cyan, border: `2px solid ${C.ink}`, borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>GUARDAR</button>
                </div>
              </div>
            ) : (
              <>
                {n.title && <div style={{ fontFamily: PX, fontSize: 9, color: C.gold, lineHeight: 1.4, marginBottom: 8 }}>{n.title}</div>}
                <div style={{ fontFamily: MONO, fontSize: 13.5, color: C.cream, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{n.text}</div>
                <div style={{ fontFamily: PX, fontSize: 6.5, color: C.muted, marginTop: 8 }}>{n.date}</div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// campaña secundaria: fases (checkbox + horas), progreso, sin deadline
function CampaignLite({ film, sessions, onMakeMain, onClear, onTogglePhase }) {
  const budgetTotal = filmBudgetH(film.minutes);
  const fsessions = sessions.filter((s) => s.film === film.id);
  const doneH = fsessions.reduce((a, s) => a + (s.minutes || 0), 0) / 60;
  const pct = Math.min(100, Math.round((doneH / budgetTotal) * 100));
  const nPhases = phasesDone(film);
  const phaseMin = {};
  fsessions.forEach((s) => { if (s.phase) phaseMin[s.phase] = (phaseMin[s.phase] || 0) + (s.minutes || 0); });
  return (
    <div style={{ background: C.bg, border: `2px solid ${C.line}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <div style={{ fontFamily: MONO, fontSize: 13, color: C.cream, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{film.film}</div>
      <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, margin: "3px 0 8px" }}>{doneH.toFixed(1)} / {budgetTotal}h · {nPhases}/{PHASES.length} fases</div>
      <SegBar pct={pct} color={C.cyan} blocks={14} />

      {/* fases con checkbox + horas */}
      <div style={{ marginTop: 10 }}>
        {PHASES.map((ph) => {
          const on = !!film.phases[ph.id];
          const h = (phaseMin[ph.id] || 0) / 60;
          return (
            <button key={ph.id} onClick={() => onTogglePhase(ph.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4, cursor: "pointer", fontFamily: MONO, fontSize: 11.5, textAlign: "left", border: `2px solid ${on ? C.cyan : C.line}`, borderRadius: 6, background: on ? "rgba(63,217,217,.10)" : "transparent", color: on ? C.cream : C.muted }}>
              <span style={{ width: 13, height: 13, flexShrink: 0, border: `2px solid ${on ? C.cyan : C.muted}`, background: on ? C.cyan : "transparent", color: C.bg, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3 }}>{on ? "✓" : ""}</span>
              <span style={{ flex: 1 }}>{ph.name}</span>
              <span style={{ fontFamily: PX, fontSize: 7, color: h > 0 ? C.cyan : C.muted }}>{h.toFixed(1)}h</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={onMakeMain} style={{ flex: 1, padding: "7px", fontFamily: PX, fontSize: 7, color: C.bg, background: C.gold, border: "none", borderRadius: 6, cursor: "pointer" }}>★ HACER PRINCIPAL</button>
        <button onClick={onClear} style={{ padding: "7px 10px", fontFamily: PX, fontSize: 7, color: C.muted, background: "none", border: `2px solid ${C.line}`, borderRadius: 6, cursor: "pointer" }}>QUITAR</button>
      </div>
    </div>
  );
}

function Campaign({ film, start, sessions, onClear }) {
  const today = todayStr();
  const budgetTotal = filmBudgetH(film.minutes);
  const fsessions = sessions.filter((s) => s.film === film.id);
  let cumW = 0;
  const rows = STAGES.map((st) => {
    cumW += st.w;
    const budget = budgetTotal * (st.w / STAGE_TOTAL_W);
    const doneH = fsessions.filter((s) => st.phases.includes(s.phase)).reduce((a, s) => a + (s.minutes || 0), 0) / 60;
    const phasesDoneAll = st.phases.every((ph) => film.phases[ph]);
    const deadline = addDays(start, Math.ceil((budgetTotal * (cumW / STAGE_TOTAL_W)) / HOURS_PER_DAY));
    const daysLeft = daysBetween(deadline, today);
    return { st, budget, doneH, phasesDoneAll, deadline, daysLeft };
  });
  const totalDoneH = fsessions.reduce((a, s) => a + (s.minutes || 0), 0) / 60;
  const finalDeadline = rows[rows.length - 1].deadline;
  const finalDaysLeft = daysBetween(finalDeadline, today);
  const complete = film.phases.final;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 14, color: C.cream, fontWeight: 700 }}>{film.film}</div>
          <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginTop: 4 }}>{totalDoneH.toFixed(1)} / {budgetTotal}h · {film.minutes} min</div>
        </div>
        <button onClick={onClear} style={{ fontFamily: PX, fontSize: 7, color: C.muted, background: "none", border: `2px solid ${C.line}`, padding: "5px 7px", cursor: "pointer" }}>CAMBIAR</button>
      </div>
      <div style={{ margin: "8px 0 4px" }}><SegBar pct={Math.min(100, Math.round((totalDoneH / budgetTotal) * 100))} color={C.gold} /></div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: complete ? C.green : (finalDaysLeft < 0 ? C.danger : C.muted), marginBottom: 12 }}>
        {complete ? "★ CAMPAÑA COMPLETADA" : `Cierre estimado: ${finalDeadline} · ${finalDaysLeft < 0 ? `${-finalDaysLeft}d atrasado` : `faltan ${finalDaysLeft}d`}`}
      </div>

      {rows.map(({ st, budget, doneH, phasesDoneAll, deadline, daysLeft }) => {
        const pct = Math.min(100, Math.round((doneH / budget) * 100));
        const behind = !phasesDoneAll && daysLeft < 0;
        const col = phasesDoneAll ? C.green : behind ? C.danger : C.cyan;
        return (
          <div key={st.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontFamily: MONO, fontSize: 12.5, color: C.cream }}>{phasesDoneAll ? "✓ " : ""}{st.name}</span>
              <span style={{ fontFamily: PX, fontSize: 7, color: col }}>{doneH.toFixed(1)}/{budget.toFixed(0)}h</span>
            </div>
            <SegBar pct={pct} color={col} blocks={14} />
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: behind ? C.danger : C.muted, marginTop: 4 }}>
              {phasesDoneAll ? "Etapa cerrada" : `Deadline ${deadline} · ${daysLeft < 0 ? `${-daysLeft}d atrasado ⚠` : `faltan ${daysLeft}d`}`}
            </div>
          </div>
        );
      })}
      <p style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted, marginTop: 6 }}>Deadlines a {HOURS_PER_DAY}h/día desde que activaste. Etapa cerrada = todas sus fases marcadas en PIEZAS. Si te atrasás, no hay castigo: lo miramos en el reporte.</p>
    </div>
  );
}

function ProjectCard({ p, phaseMin = {}, onTogglePhase, onMinutes, onRemove }) {
  const done = phasesDone(p);
  const allDone = done === PHASES.length;
  const pct = Math.round((done / PHASES.length) * 100);
  const final = isFinal(p);
  const totalH = (Object.values(phaseMin).reduce((a, m) => a + m, 0) / 60);
  return (
    <div style={{ ...panel({ borderRadius: 0, borderColor: final ? C.gold : C.line }), padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 14, color: C.cream, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.film}</div>
          <div style={{ fontFamily: PX, fontSize: 7, color: C.muted, marginTop: 4 }}>{done}/{PHASES.length} FASES · {pct}% · {totalH.toFixed(1)}h{final ? " · TERMINADO" : ""}</div>
        </div>
        {final && <span style={{ fontFamily: PX, fontSize: 7, color: C.bg, background: C.gold, padding: "4px 6px", flexShrink: 0 }}>★ FINAL</span>}
        <button onClick={onRemove} aria-label="Borrar" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px", flexShrink: 0, fontFamily: MONO }}>×</button>
      </div>

      <div style={{ margin: "10px 0" }}><SegBar pct={pct} color={final ? C.gold : C.cyan} blocks={PHASES.length} /></div>

      {/* fases de trabajo */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PHASES.map((ph) => {
          const on = !!p.phases[ph.id];
          return (
            <button key={ph.id} onClick={() => onTogglePhase(ph.id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 9px", cursor: "pointer", fontFamily: MONO, fontSize: 11.5,
              border: `2px solid ${on ? C.gold : C.line}`, background: on ? "rgba(255,197,61,.12)" : C.bg, color: on ? C.cream : C.muted,
            }}>
              <span style={{ width: 13, height: 13, border: `2px solid ${on ? C.gold : C.muted}`, background: on ? C.gold : "transparent", color: C.bg, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{on ? "✓" : ""}</span>
              {ph.name}
            </button>
          );
        })}
      </div>

      {/* FINAL — botón de terminado */}
      <button onClick={() => onTogglePhase(FINAL_PHASE)} style={{
        width: "100%", marginTop: 8, padding: "11px", cursor: "pointer", fontFamily: PX, fontSize: 9, letterSpacing: 1,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        border: `3px solid ${final ? C.gold : (allDone ? C.gold : C.line)}`,
        background: final ? C.gold : "transparent", color: final ? C.bg : (allDone ? C.gold : C.muted),
        boxShadow: final ? `0 0 14px ${C.gold}66` : "none",
      }}>
        <span style={{ width: 15, height: 15, border: `2px solid ${final ? C.bg : (allDone ? C.gold : C.muted)}`, background: final ? C.bg : "transparent", color: C.gold, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{final ? "✓" : ""}</span>
        {final ? "★ TERMINADO ★" : (allDone ? "MARCAR FINAL" : "FINAL")}
      </button>
      {allDone && !final && <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.gold, marginTop: 5, textAlign: "center" }}>Todas las fases hechas. Dale a FINAL. 🏆</div>}

      {/* min finales */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <span style={{ fontFamily: PX, fontSize: 7, color: C.muted }}>MIN FINALES</span>
        <input type="number" min="0" step="0.5" value={p.minutes} onChange={(e) => onMinutes(Math.max(0, parseFloat(e.target.value) || 0))}
          style={{ width: 70, background: C.bg, border: `2px solid ${C.line}`, color: C.cream, padding: "6px 8px", fontSize: 13, fontFamily: MONO, borderRadius: 0 }} />
        {final && <span style={{ fontFamily: PX, fontSize: 7, color: C.gold }}>→ AL METRAJE</span>}
      </div>

      {/* horas por fase */}
      <div style={{ marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
        <div style={{ fontFamily: PX, fontSize: 7, color: C.cyan, marginBottom: 8 }}>HORAS POR FASE</div>
        {PHASES.map((ph) => {
          const h = (phaseMin[ph.id] || 0) / 60;
          return (
            <div key={ph.id} style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 11.5, color: h > 0 ? C.cream : C.muted, padding: "3px 0" }}>
              <span>{p.phases[ph.id] ? "✓ " : "  "}{ph.name}</span>
              <span style={{ color: h > 0 ? C.cyan : C.muted }}>{h.toFixed(1)} h</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
