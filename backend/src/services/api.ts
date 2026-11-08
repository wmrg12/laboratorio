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