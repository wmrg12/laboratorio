# HU7: Nginx con HTTP/2 sobre TLS

El servicio web-http2 recibe conexiones HTTPS en el puerto 8443
y envía las solicitudes al backend en el puerto 3000.

## Requisitos

Docker Desktop activo y certificados server.crt y server.key
en webservers/certs. Para generarlos, seguir webservers/README.md.

## Iniciar y validar

Desde la raíz del proyecto:

powershell
docker compose up -d web-http2
docker compose exec web-http2 nginx -t


## Comprobar HTTP/2

En Windows, si curl.exe no admite HTTP/2, ejecutar:

powershell
docker run --rm curlimages/curl --http2 -k -sS -w "\nHTTP_VERSION=%{http_version}\nSTATUS=%{http_code}\n" https://host.docker.internal:8443/health


Resultado verificado:

text
{"ok":true}
HTTP_VERSION=2
STATUS=200


La opción -k permite probar el certificado autofirmado del laboratorio.
La clave privada server.key debe permanecer fuera de Git.