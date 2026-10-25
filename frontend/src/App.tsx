import { useEffect, useState } from "react";
import { Zap, Circle, Wifi } from "lucide-react";
import FormularioPrueba from "./components/FormularioPrueba";
import TransferenciaPrueba from "./components/TransferenciaPrueba";
import Dashboard from "./pages/Dashboard";
import "./App.css";

const PROTO_COLOR: Record<string, string> = {
  "h3":       "#22c55e",
  "h2":       "#6366f1",
  "http/1.1": "#f97316",
};

const PROTO_LABEL: Record<string, string> = {
  "h3":       "HTTP/3 · QUIC",
  "h2":       "HTTP/2",
  "http/1.1": "HTTP/1.1",
};

export default function App() {
  const [protocolo, setProtocolo] = useState("...");
  const [api, setApi] = useState<"conectada" | "error" | "sin respuesta" | "...">("...");

  useEffect(() => {
    const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    setProtocolo(nav?.nextHopProtocol ?? "desconocido");

    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setApi(d.ok ? "conectada" : "error"))
      .catch(() => setApi("sin respuesta"));
  }, []);

  const protoColor = PROTO_COLOR[protocolo] ?? "#888";
  const protoLabel = PROTO_LABEL[protocolo] ?? protocolo.toUpperCase();

  const apiOk    = api === "conectada";
  const apiLoading = api === "...";

  return (
    <div id="app-layout">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header id="app-header">
        <div id="header-inner">
          <div id="header-brand">
            <Zap id="header-logo-icon" size={22} strokeWidth={2.5} />
            <h1 id="header-title">Laboratorio HTTP</h1>
          </div>
          <div id="header-pills">
            {/* Pill de protocolo */}
            <div
              id="pill-proto"
              className="status-pill"
              style={{ "--pill-color": protoColor } as React.CSSProperties}
            >
              <Wifi size={13} strokeWidth={2.5} style={{ color: protoColor, flexShrink: 0 }} />
              {protocolo === "..." ? "Detectando…" : protoLabel}
            </div>

            {/* Pill de API */}
            <div
              id="pill-api"
              className={`status-pill ${apiOk ? "pill-ok" : apiLoading ? "" : "pill-err"}`}
            >
              <Circle
                size={8}
                strokeWidth={0}
                style={{
                  fill: apiOk ? "#22c55e" : apiLoading ? "#888" : "#ef4444",
                  filter: apiOk ? "drop-shadow(0 0 3px rgba(34,197,94,.6))" : "none",
                  flexShrink: 0,
                }}
              />
              API {api}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main id="app-main">
        <FormularioPrueba protocolo={protocolo} />
        <TransferenciaPrueba />
        <Dashboard />
      </main>
    </div>
  );
}