import { Elysia } from "elysia";
import { getItems } from "../controllers/items.controller";

export const itemsRoutes = new Elysia({ prefix: "/items" }).get("/", getItems);