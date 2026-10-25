import { useEffect, useState, useCallback } from "react";
import { obtenerResumen, type Resumen } from "../services/api";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
    ResponsiveContainer, Legend, Cell,
} from "recharts";
import { RefreshCw, Inbox } from "lucide-react";
import "./Dashboard.css";

// Colores por protocolo
const COLOR: Record<string, string> = {
    "http/1.1": "#f97316",  // naranja
    "h2":       "#6366f1",  // índigo
    "h3":       "#22c55e",  // verde
};

const LABEL: Record<string, string> = {
    "http/1.1": "HTTP/1.1",
    "h2":       "HTTP/2",
    "h3":       "HTTP/3",
};

// ── Tooltip personalizado ──────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit }: {
    active?: boolean;
    payload?: { value: number; name: string }[];
    label?: string;
    unit?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip-label">{label}</p>
            {payload.map((p) => (
                <p key={p.name} style={{ color: COLOR[p.name] ?? "#fff" }}>
                    {LABEL[p.name] ?? p.name}: <strong>{p.value.toFixed(2)}{unit}</strong>
                </p>
            ))}
        </div>
    );
}

// ── Tarjeta de KPI ─────────────────────────────────────────────────────────────
function KpiCard({ protocolo, datos }: { protocolo: string; datos: Resumen }) {
    const color = COLOR[protocolo] ?? "#888";
    const label = LABEL[protocolo] ?? protocolo;
    return (
        <div className="kpi-card" style={{ "--proto-color": color } as React.CSSProperties}>
            <div className="kpi-badge" style={{ background: color }}>{label}</div>
            <div className="kpi-grid">
                <div className="kpi-item">
                    <span className="kpi-value">{datos.latencia_ms.toFixed(1)}</span>
                    <span className="kpi-label">Latencia avg (ms)</span>
                </div>
                <div className="kpi-item">
                    <span className="kpi-value">{datos.throughput.toFixed(2)}</span>
                    <span className="kpi-label">Throughput (MB/s)</span>
                </div>
                <div className="kpi-item">
                    <span className="kpi-value">{datos.conexiones.toFixed(0)}</span>
                    <span className="kpi-label">Concurrencia avg</span>
                </div>
                <div className="kpi-item">
                    <span className="kpi-value">{datos.pruebas}</span>
                    <span className="kpi-label">Ejecuciones</span>
                </div>
            </div>
        </div>
    );
}

// ── Gráfico comparativo de barras agrupadas ────────────────────────────────────
function GraficoComparativo({
    datos,
    clave,
    titulo,
    unit,
}: {
    datos: Resumen[];
    clave: keyof Resumen;
    titulo: string;
    unit: string;
}) {
    // Transformar a un solo punto con una barra por protocolo
    const chartData = [
        {
            name: titulo,
            ...Object.fromEntries(datos.map((d) => [d.protocolo, Number(d[clave])])),
    }];

    const protocols = datos.map((d) => d.protocolo);

    return (
        <div className="chart-card">
            <h3 className="chart-title">{titulo}</h3>
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis
                        tick={{ fontSize: 11, fill: "var(--text)" }}
                        tickLine={false}
                        axisLine={false}
                        unit={unit}
                        width={55}
                    />
                    <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                    <Legend
                        formatter={(v) => <span style={{ color: COLOR[v], fontSize: 13 }}>{LABEL[v] ?? v}</span>}
                    />
                    {protocols.map((p) => (
                        <Bar key={p} dataKey={p} name={p} radius={[4, 4, 0, 0]}>
                            <Cell fill={COLOR[p] ?? "#888"} />
                        </Bar>
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ── Tabla comparativa ──────────────────────────────────────────────────────────
function TablaComparativa({ datos }: { datos: Resumen[] }) {
    if (datos.length === 0) return null;

    // Ganador por métrica (menor latencia, mayor throughput)
    const minLat = Math.min(...datos.map((d) => d.latencia_ms));
    const maxTp  = Math.max(...datos.map((d) => d.throughput));

    return (
        <div className="tabla-card">
            <h3 className="chart-title">Comparativa de protocolos</h3>
            <div className="tabla-scroll">
                <table className="tabla-comparativa">
                    <thead>
                        <tr>
                            <th>Protocolo</th>
                            <th>Pruebas</th>
                            <th>Latencia avg</th>
                            <th>Throughput avg</th>
                            <th>Concurrencia avg</th>
                        </tr>
                    </thead>
                    <tbody>
                        {datos.map((d) => {
                            const color = COLOR[d.protocolo] ?? "#888";
                            const isBestLat = d.latencia_ms === minLat;
                            const isBestTp  = d.throughput  === maxTp;
                            return (
                                <tr key={d.protocolo}>
                                    <td>
                                        <span className="proto-chip" style={{ background: color + "22", color, borderColor: color + "55" }}>
                                            {LABEL[d.protocolo] ?? d.protocolo}
                                        </span>
                                    </td>
                                    <td>{d.pruebas}</td>
                                    <td className={isBestLat ? "best-value" : ""}>
                                        {d.latencia_ms.toFixed(2)} ms
                                        {isBestLat && <span className="winner-badge">✓ mejor</span>}
                                    </td>
                                    <td className={isBestTp ? "best-value" : ""}>
                                        {d.throughput.toFixed(2)} MB/s
                                        {isBestTp && <span className="winner-badge">✓ mejor</span>}
                                    </td>
                                    <td>{d.conexiones.toFixed(0)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Dashboard principal ────────────────────────────────────────────────────────
export default function Dashboard() {
    const [datos, setDatos] = useState<Resumen[]>([]);
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(true);
    const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

    const cargar = useCallback(() => {
        setCargando(true);
        setError("");
        obtenerResumen()
            .then((d) => {
                setDatos(d);
                setUltimaActualizacion(new Date());
            })
            .catch((e) => setError(String(e)))
            .finally(() => setCargando(false));
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    return (
        <section className="dashboard" id="dashboard">
            <div className="dashboard-header">
                <div>
                    <h2 className="dashboard-title">Dashboard comparativo</h2>
                    <p className="dashboard-sub">HTTP/1.1 · HTTP/2 · HTTP/3 — métricas promedio de todas las ejecuciones</p>
                </div>
                <button
                    id="btn-actualizar-dashboard"
                    className="btn-refresh"
                    onClick={cargar}
                    disabled={cargando}
                    title="Actualizar datos"
                >
                    <RefreshCw size={14} strokeWidth={2} className={cargando ? "spin" : ""} />
                    {cargando ? "Cargando…" : "Actualizar"}
                </button>
            </div>

            {ultimaActualizacion && (
                <p className="dashboard-ts">
                    Última actualización: {ultimaActualizacion.toLocaleTimeString()}
                </p>
            )}

            {error && <div className="dashboard-error">⚠ {error}</div>}

            {!cargando && datos.length === 0 && !error && (
                <div className="dashboard-empty">
                    <Inbox size={32} strokeWidth={1.5} className="dashboard-empty-icon" />
                    <p>Aún no hay resultados en el sistema.</p>
                    <p className="dashboard-empty-hint">
                        Ejecutá <code>./tests/importar.sh</code> para cargar los resultados existentes,
                        o <code>./tests/matriz.sh</code> para correr la matriz completa.
                    </p>
                </div>
            )}

            {datos.length > 0 && (
                <>
                    {/* KPIs por protocolo */}
                    <div className="kpi-row">
                        {datos.map((d) => (
                            <KpiCard key={d.protocolo} protocolo={d.protocolo} datos={d} />
                        ))}
                    </div>

                    {/* Gráficos comparativos */}
                    <div className="charts-grid">
                        <GraficoComparativo
                            datos={datos}
                            clave="latencia_ms"
                            titulo="Latencia promedio"
                            unit=" ms"
                        />
                        <GraficoComparativo
                            datos={datos}
                            clave="throughput"
                            titulo="Throughput promedio"
                            unit=" MB/s"
                        />
                        <GraficoComparativo
                            datos={datos}
                            clave="conexiones"
                            titulo="Concurrencia promedio"
                            unit=""
                        />
                    </div>

                    {/* Tabla comparativa */}
                    <TablaComparativa datos={datos} />
                </>
            )}
        </section>
    );
}