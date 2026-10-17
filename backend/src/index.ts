
import { Elysia } from "elysia";
import { itemsRoutes } from "./routes/items.routes";
import { pruebasRoutes } from "./routes/pruebas.routes";
import { cors } from "@elysiajs/cors";
import { logger } from "./middleware/logger";

const allowedOrigins = (
    process.env.CORS_ORIGINS ??
    "http://localhost:5173,http://127.0.0.1:5173"
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

new Elysia()
    .use(logger)
    .use(
        cors({
            origin: allowedOrigins,
            methods: [
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS",
            ],
            allowedHeaders: [
                "Content-Type",
                "Authorization",
            ],
            credentials: false,
            maxAge: 600,
        })
    )
    .get("/health", () => ({ ok: true }))
    .use(itemsRoutes)
    .use(pruebasRoutes)
    .listen({
        port: 3000,
        hostname: "0.0.0.0",
    });
