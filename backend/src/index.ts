import { Elysia } from "elysia";
import { itemsRoutes } from "./routes/items.routes";
import { cors } from "@elysiajs/cors";
import { logger } from "./middleware/logger";

new Elysia()
    .get("/health", () => ({ ok: true }))
    .use(cors())
    .use(logger)
    .use(itemsRoutes)
    .listen({ port: 3000, hostname: "0.0.0.0" });