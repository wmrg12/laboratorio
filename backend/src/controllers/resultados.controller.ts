import {
    guardarResultado,
    listarResultados,
    obtenerResultado,
    actualizarResultado,
    eliminarResultado,
    resumenPorProtocolo,
    type Resultado,
} from "../services/resultados.service";

export const crearResultado = (body: Resultado) => guardarResultado(body);
export const obtenerResultados = (protocolo?: string) => listarResultados(protocolo);

export const getResultado = async ({
    params,
    set,
}: {
    params: { id: number };
    set: any;
}) => {
    const [resultado] = await obtenerResultado(params.id);
    if (!resultado) {
        set.status = 404;
        return { error: "Resultado no encontrado" };
    }
    return resultado;
};

export const putResultado = async ({
    params,
    body,
    set,
}: {
    params: { id: number };
    body: Partial<Resultado>;
    set: any;
}) => {
    const resultado = await actualizarResultado(params.id, body);
    if (!resultado) {
        set.status = 404;
        return { error: "Resultado no encontrado" };
    }
    return resultado;
};

export const deleteResultado = async ({
    params,
    set,
}: {
    params: { id: number };
    set: any;
}) => {
    const [resultado] = await eliminarResultado(params.id);
    if (!resultado) {
        set.status = 404;
        return { error: "Resultado no encontrado" };
    }
    return { ok: true, eliminado: resultado };
};

export const obtenerResumen = () => resumenPorProtocolo();