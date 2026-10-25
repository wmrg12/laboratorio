import { useState } from "react";
import {
    ArrowDownToLine, ArrowUpToLine,
    Loader2, AlertCircle, FileDown, FileUp, Activity
} from "lucide-react";
import "./TransferenciaPrueba.css";

const TAMANOS = [
    { etiqueta: "1 KB",   bytes: 1024 },
    { etiqueta: "100 KB", bytes: 102400 },
    { etiqueta: "1 MB",   bytes: 1048576 },
    { etiqueta: "10 MB",  bytes: 10485760 },
];

type ResultadoTransf = {
    operacion: "Descarga" | "Subida";
    bytes: number;
    tiempo_ms: number;
    throughput_mbps: number;
};

function formatBytes(n: number) {
    if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(2)} MB`;
    if (n >= 1024)      return `${(n / 1024).toFixed(1)} KB`;
    return `${n} B`;
}

export default function TransferenciaPrueba() {
    const [tamano, setTamano] = useState(1_048_576);
    const [resultado, setResultado] = useState<ResultadoTransf | null>(null);
    const [cargando, setCargando] = useState(false);
    const [operacionActiva, setOperacionActiva] = useState<"Descarga" | "Subida" | null>(null);
    const [error, setError] = useState("");
    const [progreso, setProgreso] = useState(0);

    const iniciar = (op: "Descarga" | "Subida") => {
        setCargando(true);
        setOperacionActiva(op);
        setError("");
        setResultado(null);
        setProgreso(0);

        const intervalo = setInterval(() => {
            setProgreso((p) => Math.min(p + Math.random() * 15, 90));
        }, 200);

        const limpiar = (res?: ResultadoTransf, err?: string) => {
            clearInterval(intervalo);
            setProgreso(100);
            setTimeout(() => {
                setCargando(false);
                setOperacionActiva(null);
                setProgreso(0);
                if (res) setResultado(res);
                if (err) setError(err);
            }, 300);
        };

        if (op === "Descarga") {
            const inicio = performance.now();
            fetch(`/api/archivos/${tamano}`)
                .then(async (r) => {
                    if (!r.ok) {
                        const data = await r.json();
                        throw new Error(data.error ?? `Error ${r.status}`);
                    }
                    const buf = await r.arrayBuffer();
                    const tiempo_ms = performance.now() - inicio;
                    limpiar({
                        operacion: "Descarga",
                        bytes: buf.byteLength,
                        tiempo_ms: Math.round(tiempo_ms),
                        throughput_mbps: parseFloat(
                            ((buf.byteLength / 1_048_576) / (tiempo_ms / 1000)).toFixed(2)
                        ),
                    });
                })
                .catch((e) => limpiar(undefined, String(e)));
        } else {
            const datos = new Uint8Array(tamano);
            const inicio = performance.now();
            fetch("/api/archivos", {
                method: "POST",
                headers: { "Content-Type": "application/octet-stream" },
                body: datos,
            })
                .then(async (r) => {
                    if (!r.ok) throw new Error(`Error ${r.status}`);
                    const data = await r.json();
                    const tiempo_ms = performance.now() - inicio;
                    limpiar({
                        operacion: "Subida",
                        bytes: data.bytes_recibidos,
                        tiempo_ms: Math.round(tiempo_ms),
                        throughput_mbps: parseFloat(
                            ((data.bytes_recibidos / 1_048_576) / (tiempo_ms / 1000)).toFixed(2)
                        ),
                    });
                })
                .catch((e) => limpiar(undefined, String(e)));
        }
    };

    const esDescarga = operacionActiva === "Descarga";
    const esSubida   = operacionActiva === "Subida";

    return (
        <section className="panel" id="panel-transferencia">
            <div className="panel-header">
                <Activity size={20} strokeWidth={1.8} className="panel-icon-svg" />
                <div>
                    <h2 className="panel-title">Transferencia de archivos</h2>
                    <p className="panel-sub">Medí descarga y subida en tiempo real con el protocolo activo</p>
                </div>
            </div>

            <div className="form-row">
                {/* Selector de tamaño */}
                <div className="field-group" id="field-tamano-transf">
                    <label className="field-label" htmlFor="select-tamano-transf">Tamaño</label>
                    <select
                        id="select-tamano-transf"
                        className="field-select"
                        value={tamano}
                        onChange={(e) => setTamano(Number(e.target.value))}
                        disabled={cargando}
                    >
                        {TAMANOS.map((t) => (
                            <option key={t.bytes} value={t.bytes}>{t.etiqueta}</option>
                        ))}
                    </select>
                </div>

                {/* Botón Descargar */}
                <div className="field-group field-group--action" id="field-btn-descargar">
                    <button
                        id="btn-descargar"
                        className="btn-secondary btn-download"
                        onClick={() => iniciar("Descarga")}
                        disabled={cargando}
                    >
                        {cargando && esDescarga
                            ? <><Loader2 size={15} className="spin" /> Descargando…</>
                            : <><ArrowDownToLine size={15} strokeWidth={2} /> Descargar</>
                        }
                    </button>
                </div>

                {/* Botón Subir */}
                <div className="field-group field-group--action" id="field-btn-subir">
                    <button
                        id="btn-subir"
                        className="btn-secondary btn-upload"
                        onClick={() => iniciar("Subida")}
                        disabled={cargando}
                    >
                        {cargando && esSubida
                            ? <><Loader2 size={15} className="spin" /> Subiendo…</>
                            : <><ArrowUpToLine size={15} strokeWidth={2} /> Subir</>
                        }
                    </button>
                </div>
            </div>

            {/* Barra de progreso */}
            {cargando && (
                <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${progreso}%` }} />
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="panel-alert panel-alert--error">
                    <AlertCircle size={15} strokeWidth={2} />
                    {error}
                </div>
            )}

            {/* Resultado */}
            {resultado && (
                <div className="transf-result">
                    <div className={`transf-op-badge ${resultado.operacion === "Descarga" ? "badge-down" : "badge-up"}`}>
                        {resultado.operacion === "Descarga"
                            ? <FileDown size={14} strokeWidth={2} />
                            : <FileUp size={14} strokeWidth={2} />
                        }
                        {resultado.operacion}
                    </div>
                    <div className="transf-metrics">
                        <div className="transf-metric">
                            <span className="transf-value">{resultado.throughput_mbps}</span>
                            <span className="transf-label">MB/s</span>
                        </div>
                        <div className="transf-metric">
                            <span className="transf-value">{resultado.tiempo_ms}</span>
                            <span className="transf-label">ms</span>
                        </div>
                        <div className="transf-metric">
                            <span className="transf-value">{formatBytes(resultado.bytes)}</span>
                            <span className="transf-label">transferidos</span>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
