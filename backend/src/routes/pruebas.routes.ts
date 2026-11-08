import { Elysia, t } from "elysia";
import { crearPrueba } from "../controllers/pruebas.controller";

export const pruebasRoutes = new Elysia({ prefix: "/pruebas" }).post(
    "/",
    ({ body }) => crearPrueba(body),
    {
        body: t.Object({
            protocolo: t.Union([
                t.Literal("http/1.1"),
                t.Literal("h2"),
                t.Literal("h3"),
            ]),
            metodo: t.Union([t.Literal("GET"), t.Literal("POST")]),
            tamano_bytes: t.Number({ minimum: 1 }),
            concurrencia: t.Number({ minimum: 1, maximum: 200 }),
        }),
    }
);