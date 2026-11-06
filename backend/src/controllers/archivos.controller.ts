import {
    TAMANOS_PERMITIDOS,
    generarArchivo,
    contarBytes,
} from "../services/archivos.service";

export const descargar = ({ params, set }: any) => {
    if (!TAMANOS_PERMITIDOS.includes(params.tamano)) {
        set.status = 400;
        return { error: "Tamaño no permitido", permitidos: TAMANOS_PERMITIDOS };
    }
    return new Response(generarArchivo(params.tamano), {
        headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "no-store",
        },
    });
};

export const subir = ({ body }: any) => ({
    bytes_recibidos: contarBytes(body as ArrayBuffer),
});