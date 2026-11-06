
-- migracion 001 -> para actualizar la tabla resultados
BEGIN;

ALTER TABLE resultados
    ADD COLUMN IF NOT EXISTS tamano_bytes INTEGER,
    ADD COLUMN IF NOT EXISTS concurrencia INTEGER,
    ADD COLUMN IF NOT EXISTS conexiones INTEGER,
    ADD COLUMN IF NOT EXISTS origen TEXT;

ALTER TABLE resultados
    ALTER COLUMN metodo SET NOT NULL,
    ALTER COLUMN tamano_bytes SET NOT NULL,
    ALTER COLUMN concurrencia SET NOT NULL,
    ALTER COLUMN conexiones SET NOT NULL,
    ALTER COLUMN latencia_ms TYPE DOUBLE PRECISION
        USING latencia_ms::DOUBLE PRECISION,
    ALTER COLUMN latencia_ms SET NOT NULL,
    ALTER COLUMN throughput TYPE DOUBLE PRECISION
        USING throughput::DOUBLE PRECISION,
    ALTER COLUMN throughput SET NOT NULL,
    ALTER COLUMN origen SET DEFAULT 'navegador',
    ALTER COLUMN origen SET NOT NULL;

COMMIT;
