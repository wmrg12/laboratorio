import { sql } from "../db/client";

export const listarItems = () => sql`SELECT * FROM items ORDER BY id`;

export const crearItem = (nombre: string) =>
    sql`INSERT INTO items (nombre) VALUES (${nombre}) RETURNING *`;