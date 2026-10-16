
import { Elysia } from "elysia";

export const logger = new Elysia({ name: "logger" })
    .derive({ as: "global" }, () => ({
        requestId: crypto.randomUUID(),
        startedAt: performance.now(),
    }))
    .onAfterResponse(
        { as: "global" },
        ({ request, set, requestId, startedAt }) => {
            const url = new URL(request.url);
            const elapsedMs = (
                performance.now() - startedAt
            ).toFixed(1);

            console.log(
                `[${new Date().toISOString()}] ` +
                `id=${requestId} ` +
                `${request.method} ` +
                `${url.pathname}${url.search} ` +
                `${set.status ?? 200} ` +
                `${elapsedMs}ms`
            );
        }
    );
