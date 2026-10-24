import http from "k6/http";
import { check } from "k6";

export const options = {
    insecureSkipTLSVerify: true,
    vus: Number(__ENV.VUS || 10),
    duration: __ENV.DUR || "10s",
};

export default function () {
    const r = http.get(`${__ENV.BASE}/api/archivos/${__ENV.SIZE || 102400}`);
    check(r, {
        "status 200": (x) => x.status === 200,
        "protocolo esperado": (x) => x.proto === __ENV.PROTO,
    });
}