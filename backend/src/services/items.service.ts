import { sql } from "../db/client";

export const listarItems = () => sql`SELECT * FROM items ORDER BY id`;