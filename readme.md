# Arquitectura general del laboratorio

laboratorio/
├── docker-compose.yml
├── frontend/                    # Solo código fuente React (sin Dockerfile)
│   └── src/{components,pages,services}/
├── webservers/                  # Contenedores: nginx + build de React
│   ├── Dockerfile               # etapa 1: build React → etapa 2: nginx
│   ├── http1/nginx.conf
│   ├── http2/nginx.conf
│   ├── http3/nginx.conf
│   └── certs/                   # TLS (obligatorio para HTTP/2 y HTTP/3)
├── backend/                     # Contenedor: Bun + ElysiaJS
│   ├── Dockerfile
│   └── src/
│       ├── index.ts
│       ├── middleware/          # Middleware (CORS, logs)
│       ├── routes/              # Router Elysia
│       ├── controllers/         # Controlador de Items
│       ├── services/            # Servicio de Negocio
│       └── db/                  # Cliente PostgreSQL (postgres.js)
├── database/
│   └── init.sql                 # Contenedor: PostgreSQL
├── tests/k6/                    # Generador de carga
├── netem/                       # Scripts tc-netem
├── capture/                     # Scripts tshark
├── results/                     # Logs, .pcapng, CSV
└── docs/c4/                     # Figuras
# antes de correr 
docker --version           --- decargar en pagina el desktop
docker compose version
bun --version              --- descargar 

# iniciar backend
cd backend
bun init -y
bun add elysia @elysiajs/cors postgres

# inciar DockerC
docker compose up --build

# Flujo de pruebas desde la interfaz

Abrí uno de los Nginx del laboratorio, nunca el puerto directo del backend:

- `https://localhost:8441` para HTTP/1.1
- `https://localhost:8443` para HTTP/2
- `https://localhost:8444` para HTTP/3

El selector de protocolo navega al puerto correspondiente. Al elegir GET o POST,
tamaño y concurrencia, **Ejecutar prueba** envía solicitudes reales y simultáneas
desde el navegador al endpoint Nginx `/api/archivos`. Se miden los bytes
transferidos, la duración de cada solicitud, la duración total y el throughput.
Solo si todas las solicitudes terminan correctamente se registra el promedio de
latencia y throughput en `POST /api/resultados`; el dashboard los muestra al
pulsar **Actualizar**.

La aplicación valida que el navegador haya negociado el mismo protocolo que se
seleccionó. Si HTTP/3 no se negocia (por ejemplo por falta de soporte del
navegador o por un certificado no confiable), no guarda un resultado como H3.
La ruta `POST /pruebas` se conserva por compatibilidad, pero no ejecuta cargas:
el navegador es quien debe generar el tráfico para poder medir HTTP/2 y HTTP/3
de forma real.

--verificar en otra terminal 

$ curl localhost:3000/health
{"ok":true} 

# docker y postgres iniciar y subir los datos a la db

docker compose down -v
docker compose up --build

# para verificar tablas
$ docker compose exec db psql -U lab -d lab -c "\dt"

# para verificar backend y db

curl localhost:3000/items
curl localhost:3000/health
docker compose logs backend

{"ok":true}backend-1  | GET /health 200 10.1ms

# inciar netem

Dar perimisos: chmod +x netem/netem.sh

cd ..
./netem/netem.sh aplicar latencia
./netem/netem.sh ver
for i in 1 2 3; do curl -k -s -o /dev/null -w "%{time_total}\n" https://localhost:8441/api/health; done
./netem/netem.sh quitar
