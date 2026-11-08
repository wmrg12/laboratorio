import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import type { Resumen } from "../services/api";

type Props = { datos: Resumen[]; clave: keyof Resumen; titulo: string };

export default function GraficoBarras({ datos, clave, titulo }: Props) {
    return (
        <div>
            <h3>{titulo}</h3>
            <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                    <BarChart data={datos}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="protocolo" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey={clave} fill="#6366f1" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}