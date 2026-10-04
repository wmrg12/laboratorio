CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT
);

CREATE TABLE resultados (
  id SERIAL PRIMARY KEY,
  protocolo TEXT NOT NULL,
  metodo TEXT,
  latencia_ms NUMERIC,
  throughput NUMERIC,
  creado_en TIMESTAMP DEFAULT now()
);