import { Elysia } from "elysia";
import { itemsRoutes } from "./routes/items.routes";
import { cors } from "@elysiajs/cors";
import { logger } from "./middleware/logger";

new Elysia()
    .use(cors())
    .use(logger)
    .get("/health", () => ({ ok: true }))
    .use(itemsRoutes)
    .listen({ port: 3000, hostname: "0.0.0.0" });