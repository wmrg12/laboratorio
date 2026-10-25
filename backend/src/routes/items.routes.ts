import { Elysia, t } from "elysia";
import { getItems, postItem } from "../controllers/items.controller";

export const itemsRoutes = new Elysia({ prefix: "/items" })
    .get("/", getItems)
    .post("/", postItem, {
        body: t.Object({ nombre: t.String() }),
    });
