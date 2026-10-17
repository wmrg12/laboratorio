import {
    guardarResultado,
    listarResultados,
    resumenPorProtocolo,
    type Resultado,
} from "../services/resultados.service";

export const crearResultado = (body: Resultado) => guardarResultado(body);
export const obtenerResultados = (protocolo?: string) => listarResultados(protocolo);
export const obtenerResumen = () => resumenPorProtocolo();