import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
    ArrowDownToLine, ArrowUpToLine, Loader2, AlertCircle,
    FileDown, FileUp, Activity, File, Upload, X,
} from "lucide-react";
import "./TransferenciaPrueba.css";

const TAMANOS = [
    { etiqueta: "1 KB", bytes: 1024 },
    { etiqueta: "100 KB", bytes: 102400 },
    { etiqueta: "1 MB", bytes: 1048576 },
    { etiqueta: "10 MB", bytes: 10485760 },
];

type Operacion = "Descarga" | "Subida";

type ResultadoTransf = {
    operacion: Operacion;
    bytes: number;
    tiempo_ms: number;
    throughput_mbps: number;
    archivo: string;
};

function formatBytes(n: number) {
    if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(2)} MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${n} B`;
}

function mensajeError(error: unknown) {
    return error instanceof Error ? error.message : "No se pudo completar la transferencia.";
}

export default function TransferenciaPrueba() {
    const [tamano, setTamano] = useState(1_048_576);
    const [archivo, setArchivo] = useState<File | null>(null);
    const [resultado, setResultado] = useState<ResultadoTransf | null>(null);
    const [cargando, setCargando] = useState(false);
    const [operacionActiva, setOperacionActiva] = useState<Operacion | null>(null);
    const [error, setError] = useState("");
    const [progreso, setProgreso] = useState(0);
    const [arrastrando, setArrastrando] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const seleccionarArchivo = (file?: File) => {
        if (!file) return;
        setArchivo(file);
        setResultado(null);
        setError("");
    };

    const alCambiarArchivo = (event: ChangeEvent<HTMLInputElement>) => {
        seleccionarArchivo(event.target.files?.[0]);
    };

    const alSoltarArchivo = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setArrastrando(false);
        seleccionarArchivo(event.dataTransfer.files?.[0]);
    };

    const descargar = async (): Promise<ResultadoTransf> => {
        const inicio = performance.now();
        const response = await fetch(`/api/archivos/${tamano}`);
        if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.error ?? `Error ${response.status}`);
        }

        const total = Number(response.headers.get("Content-Length")) || tamano;
        const reader = response.body?.getReader();
        const partes: BlobPart[] = [];
        let recibidos = 0;

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const copia = new Uint8Array(value.byteLength);
                copia.set(value);
                partes.push(copia.buffer);
                recibidos += value.byteLength;
                setProgreso(Math.min(99, (recibidos / total) * 100));
            }
        } else {
            const datos = await response.arrayBuffer();
            partes.push(datos);
            recibidos = datos.byteLength;
        }

        const blob = new Blob(partes, { type: "application/octet-stream" });
        const nombre = `laboratorio-descarga-${tamano}-bytes.bin`;
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = nombre;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1_000);

        const tiempo_ms = performance.now() - inicio;
        return {
            operacion: "Descarga",
            bytes: recibidos,
            tiempo_ms: Math.round(tiempo_ms),
            throughput_mbps: Number(((recibidos / 1_048_576) / (tiempo_ms / 1000)).toFixed(2)),
            archivo: nombre,
        };
    };

    const subir = (datos: Blob, nombre: string) => new Promise<ResultadoTransf>((resolve, reject) => {
        const inicio = performance.now();
        const request = new XMLHttpRequest();
        request.open("POST", "/api/archivos");
        request.setRequestHeader("Content-Type", "application/octet-stream");
        request.responseType = "json";

        request.upload.onprogress = (event) => {
            if (event.lengthComputable) setProgreso(Math.min(99, (event.loaded / event.total) * 100));
        };
        request.onerror = () => reject(new Error("No se pudo conectar con la API."));
        request.onload = () => {
            if (request.status < 200 || request.status >= 300) {
                reject(new Error(`Error ${request.status}`));
                return;
            }
            const bytes = Number(request.response?.bytes_recibidos ?? datos.size);
            const tiempo_ms = performance.now() - inicio;
            resolve({
                operacion: "Subida",
                bytes,
                tiempo_ms: Math.round(tiempo_ms),
                throughput_mbps: Number(((bytes / 1_048_576) / (tiempo_ms / 1000)).toFixed(2)),
                archivo: nombre,
            });
        };
        request.send(datos);
    });

    const iniciar = async (operacion: Operacion) => {
        setCargando(true);
        setOperacionActiva(operacion);
        setError("");
        setResultado(null);
        setProgreso(0);

        try {
            const res = operacion === "Descarga"
                ? await descargar()
                : await subir(
                    archivo ?? new Blob([new Uint8Array(tamano)], { type: "application/octet-stream" }),
                    archivo?.name ?? `datos-${tamano}-bytes.bin`,
                );
            setProgreso(100);
            setResultado(res);
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setCargando(false);
            setOperacionActiva(null);
        }
    };

    const esDescarga = operacionActiva === "Descarga";
    const esSubida = operacionActiva === "Subida";

    return (
        <section className="panel" id="panel-transferencia">
            <div className="panel-header">
                <Activity size={20} strokeWidth={1.8} className="panel-icon-svg" />
                <div>
                    <h2 className="panel-title">Transferencia de archivos</h2>
                    <p className="panel-sub">Descargá un archivo de prueba o subí uno propio y medí la transferencia real.</p>
                </div>
            </div>

            <div className="form-row">
                <div className="field-group" id="field-tamano-transf">
                    <label className="field-label" htmlFor="select-tamano-transf">Tamaño de descarga</label>
                    <select
                        id="select-tamano-transf"
                        className="field-select"
                        value={tamano}
                        onChange={(event) => setTamano(Number(event.target.value))}
                        disabled={cargando}
                    >
                        {TAMANOS.map((item) => <option key={item.bytes} value={item.bytes}>{item.etiqueta}</option>)}
                    </select>
                </div>
                <div className="field-group field-group--action" id="field-btn-descargar">
                    <button id="btn-descargar" className="btn-secondary btn-download" onClick={() => iniciar("Descarga")} disabled={cargando}>
                        {cargando && esDescarga ? <><Loader2 size={15} className="spin" /> Descargando…</> : <><ArrowDownToLine size={15} /> Descargar archivo</>}
                    </button>
                </div>
            </div>

            <div
                className={`archivo-dropzone ${arrastrando ? "archivo-dropzone--active" : ""}`}
                role="button"
                tabIndex={0}
                aria-label="Elegir archivo para subir"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
                }}
                onDragOver={(event) => { event.preventDefault(); setArrastrando(true); }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={alSoltarArchivo}
            >
                <input ref={inputRef} className="archivo-input" type="file" onChange={alCambiarArchivo} disabled={cargando} />
                {archivo ? (
                    <>
                        <File size={22} />
                        <span className="archivo-nombre">{archivo.name}</span>
                        <span className="archivo-meta">{formatBytes(archivo.size)} · listo para subir</span>
                        <button
                            type="button"
                            className="archivo-limpiar"
                            aria-label="Quitar archivo seleccionado"
                            onClick={(event) => { event.stopPropagation(); setArchivo(null); }}
                            disabled={cargando}
                        ><X size={15} /></button>
                    </>
                ) : (
                    <>
                        <Upload size={22} />
                        <span>Arrastrá un archivo aquí o hacé clic para elegirlo</span>
                        <span className="archivo-meta">Si no elegís uno, se subirán datos de prueba del tamaño seleccionado.</span>
                    </>
                )}
            </div>

            <div className="transferencia-upload-action">
                <button id="btn-subir" className="btn-secondary btn-upload" onClick={() => iniciar("Subida")} disabled={cargando}>
                    {cargando && esSubida ? <><Loader2 size={15} className="spin" /> Subiendo…</> : <><ArrowUpToLine size={15} /> {archivo ? "Subir archivo" : "Subir datos de prueba"}</>}
                </button>
            </div>

            {cargando && (
                <div className="progress-section" aria-live="polite">
                    <div className="progress-label"><span>{operacionActiva} en curso</span><span>{Math.round(progreso)}%</span></div>
                    <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${progreso}%` }} /></div>
                </div>
            )}

            {error && <div className="panel-alert panel-alert--error"><AlertCircle size={15} />{error}</div>}

            {resultado && (
                <div className="transf-result" aria-live="polite">
                    <div className={`transf-op-badge ${resultado.operacion === "Descarga" ? "badge-down" : "badge-up"}`}>
                        {resultado.operacion === "Descarga" ? <FileDown size={14} /> : <FileUp size={14} />}
                        {resultado.operacion} completada
                    </div>
                    <div className="transf-file-name" title={resultado.archivo}>{resultado.archivo}</div>
                    <div className="transf-metrics">
                        <div className="transf-metric"><span className="transf-value">{resultado.throughput_mbps}</span><span className="transf-label">MB/s</span></div>
                        <div className="transf-metric"><span className="transf-value">{resultado.tiempo_ms}</span><span className="transf-label">ms</span></div>
                        <div className="transf-metric"><span className="transf-value">{formatBytes(resultado.bytes)}</span><span className="transf-label">transferidos</span></div>
                    </div>
                </div>
            )}
        </section>
    );
}
