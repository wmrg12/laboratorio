import { useEffect, useState } from "react";
import { obtenerResumen, type Resumen } from "../services/api";
import GraficoBarras from "../components/GraficoBarras";

export default function Dashboard() {
    const [datos, setDatos] = useState<Resumen[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        obtenerResumen().then(setDatos).catch((e) => setError(String(e)));
    }, []);

    if (error) return <p>{error}</p>;
    if (datos.length === 0) return <p>Aún no hay resultados guardados.</p>;

    return (
        <section>
            <h2>Dashboard</h2>
            <table>
                <thead>
                    <tr><th>Protocolo</th><th>Pruebas</th><th>Latencia (ms)</th><th>Throughput (MB/s)</th><th>Conexiones</th></tr>
                </thead>
                <tbody>
                    {datos.map((d) => (
                        <tr key={d.protocolo}>
                            <td>{d.protocolo}</td>
                            <td>{d.pruebas}</td>
                            <td>{d.latencia_ms.toFixed(1)}</td>
                            <td>{d.throughput.toFixed(1)}</td>
                            <td>{d.conexiones.toFixed(1)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <GraficoBarras datos={datos} clave="latencia_ms" titulo="Latencia promedio (ms)" />
            <GraficoBarras datos={datos} clave="throughput" titulo="Throughput promedio (MB/s)" />
            <GraficoBarras datos={datos} clave="conexiones" titulo="Conexiones promedio" />
        </section>
    );
}