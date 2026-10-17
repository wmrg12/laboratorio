import { Elysia, t } from "elysia";
import { descargar, subir } from "../controllers/archivos.controller";

export const archivosRoutes = new Elysia({ prefix: "/archivos" })
    .get("/:tamano", descargar, { params: t.Object({ tamano: t.Numeric() }) })
    .post("/", subir);