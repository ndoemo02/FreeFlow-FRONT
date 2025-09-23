// src/components/DrWebPanel.jsx
import {useEffect, useMemo, useState} from "react";

const BACK_URL = import.meta?.env?.VITE_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || ""; 
// przykład: https://freeflow-back.vercel.app

const ENDPOINTS = {
  health: "/api/healthz",
  diag: "/api/diag",
  selftest: "/api/selftest",
  version: "/api/version",
  time: "/api/time",
};

async function jfetch(url, {timeout = 8000, ...opts} = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, {signal: ctrl.signal, ...opts});
    const text = await r.text(); // odporne, gdy nie JSON
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: e.name === "AbortError" ? "timeout" : e.message } };
  } finally {
    clearTimeout(id);
  }
}

export default function DrWebPanel() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);

  const base = useMemo(() => BACK_URL?.replace(/\/+$/, ""), []);
  const canRun = Boolean(base);

  async function runAll() {
    if (!base) return;
    setBusy(true);
    const started = new Date().toISOString();

    const results = {};
    for (const [k, path] of Object.entries(ENDPOINTS)) {
      const url = `${base}${path}`;
      results[k] = await jfetch(url, {
        headers: { "Content-Type": "application/json" }
      });
    }

    // prosty werdykt
    const ok =
      results.health?.ok &&
      results.diag?.ok &&
      results.selftest?.ok;

    const payload = {
      started,
      finished: new Date().toISOString(),
      frontendOrigin: window.location.origin,
      backendBase: base,
      verdict: ok ? "OK" : "FAIL",
      results,
    };
    setReport(payload);
    setBusy(false);
  }

  useEffect(() => {
    // Autoprobka po załadowaniu – lekka
    if (canRun) runAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun]);

  const color = report?.verdict === "OK" ? "#16a34a" : report ? "#dc2626" : "#9ca3af";
  const title = canRun ? (report?.verdict || "…") : "brak BACK_URL";

  function copy() {
    navigator.clipboard?.writeText(JSON.stringify(report, null, 2));
  }

  return (
    <>
      {/* Badge */}
      <button
        onClick={() => setOpen(v => !v)}
        title={`DrWeb: ${title}`}
        style={{
          position: "fixed", right: 12, bottom: 12, zIndex: 9999,
          background: "#111827", color: "white",
          border: "1px solid #374151", borderRadius: 9999, padding: "8px 12px",
          boxShadow: "0 6px 20px rgba(0,0,0,.25)", display: "flex",
          alignItems: "center", gap: 8
        }}
      >
        <span style={{
          width: 10, height: 10, borderRadius: 999, background: color,
          boxShadow: `0 0 0 2px rgba(0,0,0,.2)`
        }} />
        <span style={{fontSize: 12, opacity: .9}}>DrWeb</span>
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "fixed", right: 12, bottom: 56, zIndex: 9999,
          width: "min(92vw, 520px)", maxHeight: "70vh", overflow: "auto",
          background: "#0b1220", color: "white", border: "1px solid #243046",
          borderRadius: 12, padding: 12, boxShadow: "0 12px 32px rgba(0,0,0,.35)"
        }}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
            <div style={{fontWeight:600}}>DrWeb – diagnostyka</div>
            <div style={{display:"flex", gap:8}}>
              <button onClick={runAll} disabled={!canRun || busy}
                style={{padding:"6px 10px", borderRadius:8, background:"#1f2937", color:"#e5e7eb", border:"1px solid #374151"}}>
                {busy ? "Testuję…" : "Uruchom testy"}
              </button>
              <button onClick={copy} disabled={!report}
                style={{padding:"6px 10px", borderRadius:8, background:"#1f2937", color:"#e5e7eb", border:"1px solid #374151"}}>
                Kopiuj raport
              </button>
            </div>
          </div>

          {!canRun && (
            <div style={{fontSize:13, opacity:.9, lineHeight:1.4}}>
              Skonfiguruj zmienną frontu:
              <pre style={{whiteSpace:"pre-wrap", background:"#0f172a", padding:8, borderRadius:8, marginTop:6}}>
VITE_BACKEND_URL=https://twoj-back.vercel.app
              </pre>
            </div>
          )}

          {report ? (
            <pre style={{whiteSpace:"pre-wrap", background:"#0f172a", padding:8, borderRadius:8, fontSize:12, lineHeight:1.35}}>
{JSON.stringify(report, null, 2)}
            </pre>
          ) : (
            <div style={{fontSize:13, opacity:.9}}>Brak raportu – kliknij „Uruchom testy”.</div>
          )}
        </div>
      )}
    </>
  );
}
