import { sql } from "../db/client";

export type Resultado = {
    protocolo: string;
    metodo: string;
    tamano_bytes: number;
    concurrencia: number;
    conexiones: number;
    latencia_ms: number;
    throughput: number;
    origen?: string;
};

export const guardarResultado = async (r: Resultado) => {
    const [fila] = await sql`
    INSERT INTO resultados
      (protocolo, metodo, tamano_bytes, concurrencia, conexiones, latencia_ms, throughput, origen)
    VALUES
      (${r.protocolo}, ${r.metodo}, ${r.tamano_bytes}, ${r.concurrencia},
       ${r.conexiones}, ${r.latencia_ms}, ${r.throughput}, ${r.origen ?? "navegador"})
    RETURNING *`;
    return fila;
};

export const listarResultados = (protocolo?: string) =>
    protocolo
        ? sql`SELECT * FROM resultados WHERE protocolo = ${protocolo} ORDER BY id DESC`
        : sql`SELECT * FROM resultados ORDER BY id DESC`;

export const obtenerResultado = (id: number) =>
    sql`SELECT * FROM resultados WHERE id = ${id}`;

export const actualizarResultado = async (id: number, r: Partial<Resultado>) => {
    const [actual] = await sql`
    UPDATE resultados
    SET protocolo     = COALESCE(${r.protocolo ?? null}, protocolo),
        metodo        = COALESCE(${r.metodo ?? null}, metodo),
        tamano_bytes  = COALESCE(${r.tamano_bytes ?? null}, tamano_bytes),
        concurrencia  = COALESCE(${r.concurrencia ?? null}, concurrencia),
        conexiones    = COALESCE(${r.conexiones ?? null}, conexiones),
        latencia_ms   = COALESCE(${r.latencia_ms ?? null}, latencia_ms),
        throughput    = COALESCE(${r.throughput ?? null}, throughput),
        origen        = COALESCE(${r.origen ?? null}, origen)
    WHERE id = ${id}
    RETURNING *`;
    return actual;
};

export const eliminarResultado = (id: number) =>
    sql`DELETE FROM resultados WHERE id = ${id} RETURNING *`;

export const resumenPorProtocolo = () => sql`
  SELECT protocolo,
         COUNT(*)::int AS pruebas,
         AVG(latencia_ms)::float AS latencia_ms,
         AVG(throughput)::float AS throughput,
         AVG(conexiones)::float AS conexiones
  FROM resultados
  GROUP BY protocolo
  ORDER BY protocolo`;