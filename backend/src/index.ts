import { Elysia } from "elysia";

new Elysia()
    .get("/health", () => ({ ok: true }))
    .listen({ port: 3000, hostname: "0.0.0.0" });