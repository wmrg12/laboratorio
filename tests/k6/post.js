import http from "k6/http";
import { check } from "k6";

export const options = {
    insecureSkipTLSVerify: true,
    vus: Number(__ENV.VUS || 10),
    duration: __ENV.DUR || "10s",
};

const cuerpo = "x".repeat(Number(__ENV.SIZE || 102400));

export default function () {
    const r = http.post(`${__ENV.BASE}/api/archivos`, cuerpo, {
        headers: { "Content-Type": "application/octet-stream" },
    });
    check(r, {
        "status 200": (x) => x.status === 200,
        "protocolo esperado": (x) => x.proto === __ENV.PROTO,
    });
}