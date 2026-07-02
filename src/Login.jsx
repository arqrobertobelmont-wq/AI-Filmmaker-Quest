import React, { useState } from "react";
import { supabase } from "./supabase.js";

const PX = "'Press Start 2P',ui-monospace,monospace";
const MONO = "ui-monospace,'Cascadia Code','Roboto Mono',monospace";
const C = { bg: "#2B1C4E", bgDeep: "#1C1136", surface: "#3A2A60", ink: "#160E28", line: "#4B3A78", gold: "#F5C33B", cyan: "#3FD9D9", green: "#5FD16E", cream: "#F4EEDC", muted: "#A99AD6", danger: "#FF5D5D" };

export default function Login() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password: pass });
        if (error) throw error;
        setMsg("Cuenta creada. Si te pide confirmar el email, revisá tu casilla. Si no, ya podés entrar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
        if (error) throw error;
        // al loguearse, el listener de main.jsx se encarga de mostrar la app
      }
    } catch (e2) {
      setErr(e2.message || "Algo salió mal.");
    } finally {
      setBusy(false);
    }
  };

  const input = { width: "100%", background: C.bgDeep, border: `2px solid ${C.line}`, color: C.cream, padding: "11px 12px", fontSize: 14, fontFamily: MONO, borderRadius: 8, marginBottom: 12 };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(120% 90% at 50% 0%, #3A2566 0%, ${C.bg} 50%, ${C.bgDeep} 100%)`, fontFamily: MONO, padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
      <div style={{ width: 380, maxWidth: "100%", background: C.surface, border: `4px solid ${C.line}`, boxShadow: `0 0 0 3px ${C.ink}, 0 6px 0 rgba(0,0,0,.4)`, borderRadius: 14, padding: 26 }}>
        <div style={{ fontFamily: PX, fontSize: 14, color: C.green, textAlign: "center", lineHeight: 1.5, textShadow: `2px 2px 0 ${C.ink}`, marginBottom: 6 }}>AI FILMMAKER<br />QUEST</div>
        <div style={{ fontFamily: PX, fontSize: 8, color: C.cyan, textAlign: "center", marginBottom: 22 }}>{mode === "login" ? "INICIÁ SESIÓN" : "CREÁ TU CUENTA"}</div>

        <form onSubmit={submit}>
          <label style={{ fontFamily: PX, fontSize: 7, color: C.muted, display: "block", marginBottom: 6 }}>EMAIL</label>
          <input style={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@email.com" autoComplete="email" />
          <label style={{ fontFamily: PX, fontSize: 7, color: C.muted, display: "block", marginBottom: 6 }}>CONTRASEÑA</label>
          <input style={input} type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="mínimo 6 caracteres" autoComplete={mode === "login" ? "current-password" : "new-password"} />

          {err && <div style={{ color: C.danger, fontSize: 12, marginBottom: 12 }}>{err}</div>}
          {msg && <div style={{ color: C.green, fontSize: 12, marginBottom: 12 }}>{msg}</div>}

          <button type="submit" disabled={busy} style={{ width: "100%", padding: 14, fontFamily: PX, fontSize: 10, color: C.ink, background: C.gold, border: `3px solid ${C.ink}`, borderRadius: 10, cursor: busy ? "default" : "pointer", fontWeight: 700, boxShadow: `0 4px 0 rgba(0,0,0,.4)`, opacity: busy ? 0.7 : 1 }}>
            {busy ? "..." : mode === "login" ? "ENTRAR" : "CREAR CUENTA"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18, fontFamily: MONO, fontSize: 12, color: C.muted }}>
          {mode === "login" ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(null); setMsg(null); }} style={{ background: "none", border: "none", color: C.cyan, cursor: "pointer", fontFamily: MONO, fontSize: 12, textDecoration: "underline" }}>
            {mode === "login" ? "Registrate" : "Iniciá sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
