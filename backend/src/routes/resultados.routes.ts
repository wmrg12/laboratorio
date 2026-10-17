import { Elysia, t } from "elysia";
import { crearResultado, obtenerResultados, obtenerResumen } from "../controllers/resultados.controller";

export const resultadosRoutes = new Elysia({ prefix: "/resultados" })
    .post("/", ({ body }) => crearResultado(body), {
        body: t.Object({
            protocolo: t.Union([t.Literal("http/1.1"), t.Literal("h2"), t.Literal("h3")]),
            metodo: t.Union([t.Literal("GET"), t.Literal("POST")]),
            tamano_bytes: t.Number({ minimum: 1 }),
            concurrencia: t.Number({ minimum: 1 }),
            conexiones: t.Number({ minimum: 0 }),
            latencia_ms: t.Number({ minimum: 0 }),
            throughput: t.Number({ minimum: 0 }),
            origen: t.Optional(t.String()),
        }),
    })
    .get("/", ({ query }) => obtenerResultados(query.protocolo), {
        query: t.Object({ protocolo: t.Optional(t.String()) }),
    })
    .get("/resumen", () => obtenerResumen());