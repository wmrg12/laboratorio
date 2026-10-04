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

[]{"ok":true}backend-1  | GET /items 200 231.7ms