import { registrarPrueba, type PruebaConfig } from "../services/pruebas.service";

export const crearPrueba = (config: PruebaConfig) => registrarPrueba(config);