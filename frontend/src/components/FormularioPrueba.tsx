import { useState } from "react";
import { enviarConfig } from "../services/api";

const PUERTOS: Record<string, number> = { "http/1.1": 8441, h2: 8442, h3: 8443 };
const TAMANOS = [
    { etiqueta: "1 KB", bytes: 1024 },
    { etiqueta: "100 KB", bytes: 102400 },
    { etiqueta: "1 MB", bytes: 1048576 },
    { etiqueta: "10 MB", bytes: 10485760 },
];

export default function FormularioPrueba({ protocolo }: { protocolo: string }) {
    const [metodo, setMetodo] = useState<"GET" | "POST">("GET");
    const [tamano, setTamano] = useState(1024);
    const [concurrencia, setConcurrencia] = useState(10);
    const [respuesta, setRespuesta] = useState("");

    const cambiarProtocolo = (p: string) => {
        window.location.href = `https://${location.hostname}:${PUERTOS[p]}/`;
    };

    const enviar = async () => {
        try {
            const r = await enviarConfig({
                protocolo,
                metodo,
                tamano_bytes: tamano,
                concurrencia,
            });
            setRespuesta(JSON.stringify(r, null, 2));
        } catch (e) {
            setRespuesta(String(e));
        }
    };

    return (
        <section>
            <h2>Configurar prueba</h2>
            <label>Protocolo{" "}
                <select value={protocolo} onChange={(e) => cambiarProtocolo(e.target.value)}>
                    {Object.keys(PUERTOS).map((p) => <option key={p}>{p}</option>)}
                </select>
            </label>{" "}
            <label>Método{" "}
                <select value={metodo} onChange={(e) => setMetodo(e.target.value as "GET" | "POST")}>
                    <option>GET</option>
                    <option>POST</option>
                </select>
            </label>{" "}
            <label>Tamaño{" "}
                <select value={tamano} onChange={(e) => setTamano(Number(e.target.value))}>
                    {TAMANOS.map((t) => <option key={t.bytes} value={t.bytes}>{t.etiqueta}</option>)}
                </select>
            </label>{" "}
            <label>Concurrencia{" "}
                <input type="number" min={1} max={200} value={concurrencia}
                    onChange={(e) => setConcurrencia(Number(e.target.value))} />
            </label>{" "}
            <button onClick={enviar}>Enviar configuración</button>
            <pre>{respuesta}</pre>
        </section>
    );
}