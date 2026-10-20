import { useState } from 'react';

const TAMANOS = [
    { etiqueta: "1 KB", bytes: 1024 },
    { etiqueta: "100 KB", bytes: 102400 },
    { etiqueta: "1 MB", bytes: 1048576 },
    { etiqueta: "10 MB", bytes: 10485760 },
];

type Resultado = {
    operacion: string;
    bytes: number;
    tiempo_ms: number;
    throughput_mbps: number;
};

export default function TransferenciaPrueba() {
    const [tamano, setTamano] = useState(1048576);
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    const descargar = async () => {
        setCargando(true);
        setError("");
        setResultado(null);
        try {
            const inicio = performance.now();
            const r = await fetch(`/api/archivos/${tamano}`);
            if (!r.ok) {
                const data = await r.json();
                throw new Error(data.error ?? `Error ${r.status}`);
            }
            const buf = await r.arrayBuffer();
            const tiempo_ms = performance.now() - inicio;
            setResultado({
                operacion: "Descarga",
                bytes: buf.byteLength,
                tiempo_ms: Math.round(tiempo_ms),
                throughput_mbps: parseFloat(
                    ((buf.byteLength / 1024 / 1024) / (tiempo_ms / 1000)).toFixed(2)
                ),
            });
        } catch (e) {
            setError(String(e));
        } finally {
            setCargando(false);
        }
    };

    const subir = async () => {
        setCargando(true);
        setError("");
        setResultado(null);
        try {
            const datos = new Uint8Array(tamano);
            const inicio = performance.now();
            const r = await fetch("/api/archivos", {
                method: "POST",
                headers: { "Content-Type": "application/octet-stream" },
                body: datos,
            });
            if (!r.ok) throw new Error(`Error ${r.status}`);
            const data = await r.json();
            const tiempo_ms = performance.now() - inicio;
            setResultado({
                operacion: "Subida",
                bytes: data.bytes_recibidos,
                tiempo_ms: Math.round(tiempo_ms),
                throughput_mbps: parseFloat(
                    ((data.bytes_recibidos / 1024 / 1024) / (tiempo_ms / 1000)).toFixed(2)
                ),
            });
        } catch (e) {
            setError(String(e));
        } finally {
            setCargando(false);
        }
    };

    return (
        <section>
            <h2>Transferencia de archivos</h2>
            <label>
                Tamaño{" "}
                <select value={tamano} onChange={(e) => setTamano(Number(e.target.value))}>
                    {TAMANOS.map((t) => (
                        <option key={t.bytes} value={t.bytes}>{t.etiqueta}</option>
                    ))}
                </select>
            </label>{" "}
            <button onClick={descargar} disabled={cargando}>
                ⬇ Descargar
            </button>{" "}
            <button onClick={subir} disabled={cargando}>
                ⬆ Subir
            </button>

            {cargando && <p>Transfiriendo...</p>}
            {error && <p style={{ color: "red" }}>❌ {error}</p>}
            {resultado && (
                <table>
                    <thead>
                        <tr>
                            <th>Operación</th>
                            <th>Bytes</th>
                            <th>Tiempo (ms)</th>
                            <th>Throughput (MB/s)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{resultado.operacion}</td>
                            <td>{resultado.bytes.toLocaleString()}</td>
                            <td>{resultado.tiempo_ms}</td>
                            <td>{resultado.throughput_mbps}</td>
                        </tr>
                    </tbody>
                </table>
            )}
        </section>
    );
}
