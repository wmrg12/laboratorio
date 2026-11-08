export type PruebaConfig = {
    protocolo: "http/1.1" | "h2" | "h3";
    metodo: "GET" | "POST";
    tamano_bytes: number;
    concurrencia: number;
};

export const registrarPrueba = async (config: PruebaConfig) => ({
    ok: true,
    recibido: config,
    recibido_en: new Date().toISOString(),
});
