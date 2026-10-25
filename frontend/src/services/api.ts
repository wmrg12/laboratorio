export type PruebaConfig = {
    protocolo: string;
    metodo: "GET" | "POST";
    tamano_bytes: number;
    concurrencia: number;
};

export async function enviarConfig(config: PruebaConfig) {
    const r = await fetch("/api/pruebas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
    });
    if (!r.ok) throw new Error(`Error ${r.status}`);
    return r.json();
}

export type Resumen = {
    protocolo: string;
    pruebas: number;
    latencia_ms: number;
    throughput: number;
    conexiones: number;
};

export type Resultado = {
    protocolo: "http/1.1" | "h2" | "h3";
    metodo: "GET" | "POST";
    tamano_bytes: number;
    concurrencia: number;
    conexiones: number;
    latencia_ms: number;
    throughput: number;
    origen?: string;
};

export const crearResultado = async (resultado: Resultado) => {
    const r = await fetch("/api/resultados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultado),
    });
    if (!r.ok) throw new Error(`Error ${r.status}`);
    return r.json();
};

export const obtenerResumen = async (): Promise<Resumen[]> => {
    const r = await fetch("/api/resultados/resumen");
    if (!r.ok) throw new Error(`Error ${r.status}`);
    return r.json();
};