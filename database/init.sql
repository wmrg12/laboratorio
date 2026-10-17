CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT
);

CREATE TABLE resultados (
  id SERIAL PRIMARY KEY,
  protocolo TEXT NOT NULL,
  metodo TEXT NOT NULL,
  tamano_bytes INTEGER NOT NULL,
  concurrencia INTEGER NOT NULL,
  conexiones INTEGER NOT NULL,
  latencia_ms DOUBLE PRECISION NOT NULL,
  throughput DOUBLE PRECISION NOT NULL,
  origen TEXT NOT NULL DEFAULT 'navegador',
  creado_en TIMESTAMP DEFAULT now()
);