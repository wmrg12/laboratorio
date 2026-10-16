import { useEffect, useState } from "react";

export default function App() {
  const [protocolo, setProtocolo] = useState("...");
  const [api, setApi] = useState("...");

  useEffect(() => {
    const [nav] = performance.getEntriesByType(
      "navigation"
    ) as PerformanceNavigationTiming[];
    setProtocolo(nav?.nextHopProtocol ?? "desconocido");

    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setApi(d.ok ? "conectada" : "error"))
      .catch(() => setApi("sin respuesta"));
  }, []);

  return (
    <main>
      <h1>Laboratorio HTTP</h1>
      <p>Protocolo de esta página: <b>{protocolo}</b></p>
      <p>API: <b>{api}</b></p>
    </main>
  );
}