import { listarItems, crearItem } from "../services/items.service";

export const getItems = async () => await listarItems();

export const postItem = async ({ body }: { body: { nombre: string } }) =>
    await crearItem(body.nombre);
