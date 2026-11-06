# Configuración TLS y servidores web

## 1. Generar certificados autofirmados

Los certificados permiten habilitar HTTPS en los servidores Nginx. Para el entorno de laboratorio se utiliza un certificado autofirmado.

**Este paso solo es necesario si los certificados no existen en `webservers/certs/`.**

Desde la raíz del proyecto, ejecutar en PowerShell:

```powershell
docker run --rm `
  -v "${PWD}/webservers/certs:/certs" `
  alpine/openssl req -x509 -nodes -days 365 `
  -newkey rsa:2048 `
  -keyout /certs/server.key `
  -out /certs/server.crt `
  -subj "/CN=localhost" `
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

Se generan los siguientes archivos:

- `webservers/certs/server.crt`: certificado TLS.
- `webservers/certs/server.key`: clave privada del servidor.

**Importante:** no subir `server.key` al repositorio Git. El archivo debe permanecer excluido mediante `.gitignore`.

## 2. Iniciar el laboratorio

Ejecutar desde la raíz del proyecto:

```powershell
docker compose config
docker compose up --build -d
docker compose ps
```

El primer comando valida la configuración de Docker Compose, el segundo construye e inicia los servicios y el tercero muestra su estado.

## 3. Verificar HTTPS y TLS 1.3

Comprobar que el endpoint de salud responde a través de HTTPS:

```powershell
curl.exe -k --tlsv1.3 --tls-max 1.3 -v https://localhost/health
```

La respuesta esperada es HTTP `200 OK` con un cuerpo similar a:

```json
{"ok":true}
```

Para comprobar la versión TLS negociada, ejecutar desde PowerShell:

```powershell
docker run --rm --network laboratorio_lab-net alpine/openssl s_client -connect web-http1:443 -servername localhost -tls1_3
```

Buscar en la salida una línea que indique `TLSv1.3`.

El certificado es autofirmado, por lo que OpenSSL puede mostrar el código de verificación `18`. Esto es esperado en el entorno local.

> Nota: `laboratorio_lab-net` es el nombre de la red utilizado en este entorno. Si Docker Compose crea una red con otro nombre, sustituirlo por el nombre correspondiente.

## 4. Consultar los registros

Para revisar los registros de Nginx:

```powershell
docker compose logs web-http1
```

Para revisar los registros del backend:

```powershell
docker compose logs backend
```

## 5. Detener el laboratorio

```powershell
docker compose down
```

Este comando detiene y elimina los contenedores del proyecto sin eliminar el volumen de datos de PostgreSQL, si existe uno configurado.
