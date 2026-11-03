export type ConfiguracionPruebaReal = {
    protocolo: "http/1.1" | "h2" | "h3";
    metodo: "GET" | "POST";
    tamanoBytes: number;
    concurrencia: number;
};

export type MedicionPruebaReal = {
    bytesTransferidos: number;
    duracionTotalMs: number;
    latenciaPromedioMs: number;
    throughputMBps: number;
};

type MedicionSolicitud = {
    bytes: number;
    duracionMs: number;
};

async function contarBytes(response: Response): Promise<number> {
    if (!response.body) return (await response.arrayBuffer()).byteLength;

    const reader = response.body.getReader();
    let bytes = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
    }
    return bytes;
}

async function descargar(tamanoBytes: number): Promise<MedicionSolicitud> {
    const inicio = performance.now();
    const response = await fetch(`/api/archivos/${tamanoBytes}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`La descarga respondió HTTP ${response.status}`);

    const bytes = await contarBytes(response);
    const duracionMs = performance.now() - inicio;
    if (bytes !== tamanoBytes) {
        throw new Error(`La descarga recibió ${bytes} bytes; se esperaban ${tamanoBytes}`);
    }
    return { bytes, duracionMs };
}

async function subir(cuerpo: ArrayBuffer, tamanoBytes: number): Promise<MedicionSolicitud> {
    const inicio = performance.now();
    const response = await fetch("/api/archivos", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: cuerpo,
    });
    if (!response.ok) throw new Error(`La subida respondió HTTP ${response.status}`);

    const data: unknown = await response.json();
    const bytes = typeof data === "object" && data !== null && "bytes_recibidos" in data
        ? Number(data.bytes_recibidos)
        : Number.NaN;
    const duracionMs = performance.now() - inicio;
    if (!Number.isFinite(bytes) || bytes !== tamanoBytes) {
        throw new Error(`La subida registró ${bytes} bytes; se esperaban ${tamanoBytes}`);
    }
    return { bytes, duracionMs };
}

/** Ejecuta tráfico real desde el navegador y no genera métricas artificiales. */
export async function ejecutarPruebaReal(
    configuracion: ConfiguracionPruebaReal,
): Promise<MedicionPruebaReal> {
    const { metodo, tamanoBytes, concurrencia } = configuracion;
    const inicioTotal = performance.now();
    const cuerpo = metodo === "POST" ? new ArrayBuffer(tamanoBytes) : undefined;
    const solicitudes = Array.from({ length: concurrencia }, () =>
        metodo === "GET" ? descargar(tamanoBytes) : subir(cuerpo!, tamanoBytes),
    );
    const mediciones = await Promise.all(solicitudes);
    const duracionTotalMs = performance.now() - inicioTotal;
    const bytesTransferidos = mediciones.reduce((total, medicion) => total + medicion.bytes, 0);
    const latenciaPromedioMs = mediciones.reduce(
        (total, medicion) => total + medicion.duracionMs,
        0,
    ) / mediciones.length;

    if (duracionTotalMs <= 0) {
        throw new Error("No se pudo calcular una duración válida para la prueba");
    }

    return {
        bytesTransferidos,
        duracionTotalMs,
        latenciaPromedioMs,
        // MB decimales, igual que los scripts de carga existentes.
        throughputMBps: bytesTransferidos / 1_000_000 / (duracionTotalMs / 1000),
    };
}
