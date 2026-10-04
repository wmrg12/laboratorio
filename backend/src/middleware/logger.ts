import { Elysia } from "elysia";

export const logger = new Elysia({ name: "logger" })
    .derive({ as: "global" }, () => ({ inicio: performance.now() }))
    .onAfterResponse({ as: "global" }, ({ request, set, inicio }) => {
        const ms = (performance.now() - inicio).toFixed(1);
        const ruta = new URL(request.url).pathname;
        console.log(`${request.method} ${ruta} ${set.status ?? 200} ${ms}ms`);
    });