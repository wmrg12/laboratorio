import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { CheckCircle2, FileJson, Import, Loader2, Upload, XCircle } from "lucide-react";
import { crearResultado, type Resultado } from "../services/api";
import "./ImportadorResultados.css";

type EstadoArchivo = "importado" | "omitido" | "error";

type Informe = {
    nombre: string;
    estado: EstadoArchivo;
    detalle: string;
};

type ArchivoResultado = {
    metrics?: {
        http_req_duration?: { avg?: number };
        http_reqs?: { rate?: number };
    };
    lat_avg_ms?: number;
    mb_s?: number;
};

const NOMBRE_K6 = /^(http[12])_([a-z]+)_([0-9]+)vus(?:_([0-9]+)b)?\.json$/i;
const NOMBRE_CURL = /^curl_(http[123])_([a-z]+)_([0-9]+)vus_([0-9]+)b\.json$/i;

function numero(valor: unknown) {
    const resultado = Number(valor);
    return Number.isFinite(resultado) ? resultado : 0;
}

function protocoloApi(protocolo: string): Resultado["protocolo"] | null {
    if (protocolo === "http1") return "http/1.1";
    if (protocolo === "http2") return "h2";
    if (protocolo === "http3") return "h3";
    return null;
}

async function convertirArchivo(archivo: File): Promise<Resultado> {
    const nombre = archivo.name;
    const datos = JSON.parse(await archivo.text()) as ArchivoResultado;
    const k6 = nombre.match(NOMBRE_K6);
    if (k6) {
        const protocolo = protocoloApi(k6[1].toLowerCase());
        if (!protocolo) throw new Error("Protocolo no soportado.");
        const tamano = numero(k6[4]) || 102400;
        const conexiones = numero(k6[3]);
        const latencia = numero(datos.metrics?.http_req_duration?.avg);
        const solicitudesPorSegundo = numero(datos.metrics?.http_reqs?.rate);
        return {
            protocolo,
            metodo: k6[2].toUpperCase() === "POST" ? "POST" : "GET",
            tamano_bytes: tamano,
            concurrencia: conexiones,
            conexiones,
            latencia_ms: Number(latencia.toFixed(2)),
            throughput: Number((solicitudesPorSegundo * tamano / 1e6).toFixed(4)),
            origen: "importado_k6_web",
        };
    }

    const curl = nombre.match(NOMBRE_CURL);
    if (curl) {
        const protocolo = protocoloApi(curl[1].toLowerCase());
        if (!protocolo) throw new Error("Protocolo no soportado.");
        const conexiones = numero(curl[3]);
        return {
            protocolo,
            metodo: curl[2].toUpperCase() === "POST" ? "POST" : "GET",
            tamano_bytes: numero(curl[4]),
            concurrencia: conexiones,
            conexiones,
            latencia_ms: Number(numero(datos.lat_avg_ms).toFixed(2)),
            throughput: Number(numero(datos.mb_s).toFixed(4)),
            origen: "importado_curl_web",
        };
    }

    throw new Error("El nombre no corresponde a un resultado de k6 o curl.");
}

export default function ImportadorResultados() {
    const [archivos, setArchivos] = useState<File[]>([]);
    const [informes, setInformes] = useState<Informe[]>([]);
    const [arrastrando, setArrastrando] = useState(false);
    const [importando, setImportando] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const agregarArchivos = (nuevos: FileList | File[]) => {
        const json = Array.from(nuevos).filter((archivo) => archivo.name.toLowerCase().endsWith(".json"));
        setArchivos((actuales) => [...actuales, ...json]);
        setInformes([]);
    };

    const cambiarInput = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) agregarArchivos(event.target.files);
        event.target.value = "";
    };

    const soltar = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setArrastrando(false);
        agregarArchivos(event.dataTransfer.files);
    };

    const quitarArchivo = (indice: number) => setArchivos((actuales) => actuales.filter((_, i) => i !== indice));

    const importar = async () => {
        if (archivos.length === 0) return;
        setImportando(true);
        const resultado: Informe[] = [];

        for (const archivo of archivos) {
            try {
                const dato = await convertirArchivo(archivo);
                await crearResultado(dato);
                resultado.push({ nombre: archivo.name, estado: "importado", detalle: "Guardado en el Dashboard." });
            } catch (error) {
                const detalle = error instanceof Error ? error.message : "No se pudo procesar el archivo.";
                resultado.push({ nombre: archivo.name, estado: detalle.includes("nombre") ? "omitido" : "error", detalle });
            }
        }

        setInformes(resultado);
        setImportando(false);
        if (resultado.some((item) => item.estado === "importado")) {
            window.dispatchEvent(new Event("resultados-importados"));
        }
    };

    const importados = informes.filter((item) => item.estado === "importado").length;

    return (
        <section className="panel" id="panel-importador">
            <div className="panel-header">
                <Import size={20} strokeWidth={1.8} className="panel-icon-svg" />
                <div>
                    <h2 className="panel-title">Importar resultados de pruebas</h2>
                    <p className="panel-sub">Soltá los JSON generados por k6 o curl. Se cargarán al Dashboard sin usar la terminal.</p>
                </div>
            </div>

            <div
                className={`import-dropzone ${arrastrando ? "import-dropzone--active" : ""}`}
                role="button"
                tabIndex={0}
                aria-label="Elegir archivos JSON de resultados"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
                }}
                onDragOver={(event) => { event.preventDefault(); setArrastrando(true); }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={soltar}
            >
                <input ref={inputRef} className="archivo-input" type="file" accept="application/json,.json" multiple onChange={cambiarInput} disabled={importando} />
                <Upload size={23} />
                <strong>Arrastrá resultados JSON aquí o elegilos desde tu equipo</strong>
                <span>Formatos: <code>http1_get_10vus_102400b.json</code> y <code>curl_http3_get_10vus_102400b.json</code></span>
            </div>

            {archivos.length > 0 && (
                <div className="import-files">
                    <div className="import-files-header"><span>{archivos.length} archivo(s) preparado(s)</span><button type="button" onClick={() => setArchivos([])} disabled={importando}>Limpiar</button></div>
                    <ul>
                        {archivos.map((archivo, indice) => (
                            <li key={`${archivo.name}-${indice}`}><FileJson size={15} /><span title={archivo.name}>{archivo.name}</span><button type="button" aria-label={`Quitar ${archivo.name}`} onClick={() => quitarArchivo(indice)} disabled={importando}><XCircle size={16} /></button></li>
                        ))}
                    </ul>
                    <button className="btn-primary btn-importar" type="button" onClick={importar} disabled={importando}>
                        {importando ? <><Loader2 size={15} className="spin" /> Importando…</> : <><Import size={15} /> Importar al Dashboard</>}
                    </button>
                </div>
            )}

            {informes.length > 0 && (
                <div className="import-report" aria-live="polite">
                    <div className="import-report-title"><CheckCircle2 size={16} /> {importados} de {informes.length} archivo(s) importado(s)</div>
                    {informes.map((informe, indice) => <p key={`${informe.nombre}-${indice}`} className={`import-report-item import-report-item--${informe.estado}`}><strong>{informe.nombre}</strong><span>{informe.detalle}</span></p>)}
                </div>
            )}
        </section>
    );
}
