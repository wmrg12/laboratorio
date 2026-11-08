FROM oven/bun:1 AS build
WORKDIR /app
COPY frontend/package.json frontend/bun.lock* ./
RUN bun install
COPY frontend/ .
RUN bun run build

FROM nginx:1.27
COPY --from=build /app/dist /usr/share/nginx/html