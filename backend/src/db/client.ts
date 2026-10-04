import postgres from "postgres";

export const sql = postgres(
    process.env.DATABASE_URL ?? "postgres://lab:lab@db:5432/lab"
);