import { Elysia, t } from "elysia";
import {
    crearResultado,
    obtenerResultados,
    getResultado,
    putResultado,
    deleteResultado,
    obtenerResumen,
} from "../controllers/resultados.controller";

const resultadoBodySchema = t.Object({
    protocolo: t.Union([t.Literal("http/1.1"), t.Literal("h2"), t.Literal("h3")]),
    metodo: t.Union([t.Literal("GET"), t.Literal("POST")]),
    tamano_bytes: t.Number({ minimum: 1 }),
    concurrencia: t.Number({ minimum: 1 }),
    conexiones: t.Number({ minimum: 0 }),
    latencia_ms: t.Number({ minimum: 0 }),
    throughput: t.Number({ minimum: 0 }),
    origen: t.Optional(t.String()),
});

const resultadoBodyUpdateSchema = t.Partial(resultadoBodySchema);

export const resultadosRoutes = new Elysia({ prefix: "/resultados" })
    .post("/", ({ body }) => crearResultado(body), {
        body: resultadoBodySchema,
    })
    .get("/", ({ query }) => obtenerResultados(query.protocolo), {
        query: t.Object({ protocolo: t.Optional(t.String()) }),
    })
    .get("/:id", getResultado, { params: t.Object({ id: t.Numeric() }) })
    .put("/:id", putResultado, {
        params: t.Object({ id: t.Numeric() }),
        body: resultadoBodyUpdateSchema,
    })
    .delete("/:id", deleteResultado, { params: t.Object({ id: t.Numeric() }) })
    .get("/resumen", () => obtenerResumen());