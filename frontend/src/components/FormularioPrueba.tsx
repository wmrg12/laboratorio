import { useState } from "react";
import { Settings, Play, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { enviarConfig } from "../services/api";
import "./FormularioPrueba.css";

const PUERTOS: Record<string, number> = { "http/1.1": 8441, h2: 8443, h3: 8444 };

const TAMANOS = [
    { etiqueta: "1 KB",   bytes: 1024 },
    { etiqueta: "100 KB", bytes: 102400 },
    { etiqueta: "1 MB",   bytes: 1048576 },
    { etiqueta: "10 MB",  bytes: 10485760 },
];

const PROTO_LABEL: Record<string, string> = {
    "http/1.1": "HTTP/1.1",
    "h2":       "HTTP/2",
    "h3":       "HTTP/3",
};

export default function FormularioPrueba({ protocolo }: { protocolo: string }) {
    const [metodo, setMetodo] = useState<"GET" | "POST">("GET");
    const [tamano, setTamano] = useState(1024);
    const [concurrencia, setConcurrencia] = useState(10);
    const [respuesta, setRespuesta] = useState<object | null>(null);
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);

    const cambiarProtocolo = (p: string) => {
        window.location.href = `https://${location.hostname}:${PUERTOS[p]}/`;
    };

    const enviar = async () => {
        setEnviando(true);
        setError("");
        setRespuesta(null);
        try {
            const r = await enviarConfig({ protocolo, metodo, tamano_bytes: tamano, concurrencia });
            setRespuesta(r);
        } catch (e) {
            setError(String(e));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <section className="panel" id="panel-configurar">
            <div className="panel-header">
                <Settings size={20} strokeWidth={1.8} className="panel-icon-svg" />
                <div>
                    <h2 className="panel-title">Configurar prueba</h2>
                    <p className="panel-sub">Ajustá los parámetros y enviá la configuración al servidor</p>
                </div>
            </div>

            <div className="form-row">
                {/* Protocolo */}
                <div className="field-group" id="field-protocolo">
                    <label className="field-label" htmlFor="select-protocolo">Protocolo</label>
                    <select
                        id="select-protocolo"
                        className="field-select"
                        value={protocolo}
                        onChange={(e) => cambiarProtocolo(e.target.value)}
                    >
                        {Object.keys(PUERTOS).map((p) => (
                            <option key={p} value={p}>{PROTO_LABEL[p] ?? p}</option>
                        ))}
                    </select>
                </div>

                {/* Método */}
                <div className="field-group" id="field-metodo">
                    <label className="field-label">Método</label>
                    <div className="method-toggle">
                        {(["GET", "POST"] as const).map((m) => (
                            <button
                                key={m}
                                id={`btn-metodo-${m.toLowerCase()}`}
                                className={`method-btn ${metodo === m ? "method-btn--active" : ""}`}
                                onClick={() => setMetodo(m)}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tamaño */}
                <div className="field-group" id="field-tamano">
                    <label className="field-label" htmlFor="select-tamano">Tamaño</label>
                    <select
                        id="select-tamano"
                        className="field-select"
                        value={tamano}
                        onChange={(e) => setTamano(Number(e.target.value))}
                    >
                        {TAMANOS.map((t) => (
                            <option key={t.bytes} value={t.bytes}>{t.etiqueta}</option>
                        ))}
                    </select>
                </div>

                {/* Concurrencia */}
                <div className="field-group" id="field-concurrencia">
                    <label className="field-label" htmlFor="input-concurrencia">
                        Concurrencia
                        <span className="field-hint">(1–200)</span>
                    </label>
                    <input
                        id="input-concurrencia"
                        className="field-input"
                        type="number"
                        min={1}
                        max={200}
                        value={concurrencia}
                        onChange={(e) => setConcurrencia(Number(e.target.value))}
                    />
                </div>

                {/* Botón enviar */}
                <div className="field-group field-group--action">
                    <button
                        id="btn-enviar-config"
                        className="btn-primary"
                        onClick={enviar}
                        disabled={enviando}
                    >
                        {enviando
                            ? <><Loader2 size={15} className="spin" /> Enviando…</>
                            : <><Play size={14} strokeWidth={2.5} /> Enviar</>
                        }
                    </button>
                </div>
            </div>

            {error && (
                <div className="panel-alert panel-alert--error">
                    <AlertCircle size={15} strokeWidth={2} />
                    {error}
                </div>
            )}

            {respuesta && (
                <div className="panel-alert panel-alert--ok">
                    <div className="alert-row">
                        <CheckCircle size={15} strokeWidth={2} />
                        <span>Configuración recibida</span>
                    </div>
                    <pre className="panel-pre">{JSON.stringify(respuesta, null, 2)}</pre>
                </div>
            )}
        </section>
    );
}