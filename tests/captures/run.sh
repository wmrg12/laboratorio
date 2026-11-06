
#!/usr/bin/env bash
# Uso: run.sh <http1|http2|http3> <nombre> <duracion_captura> -- <comando_prueba>

set -u

if [ "$#" -lt 5 ] || [ "$4" != "--" ]; then
  echo "Uso: $0 <protocolo> <nombre> <duracion> -- <comando>"
  exit 1
fi

P=$1
NOMBRE=$2
DUR=$3
shift 4

# Seleccionar el servidor y el filtro de captura
case "$P" in
  http1)
    SERVER=laboratorio-web-http1-1
    FILTRO="tcp port 443"
    ;;
  http2)
    SERVER=laboratorio-web-http2-1
    FILTRO="tcp port 443"
    ;;
  http3)
    SERVER=laboratorio-web-http3-1
    FILTRO="udp port 443"
    ;;
  *)
    echo "Protocolo desconocido: $P"
    exit 1
    ;;
esac

if ! [[ "$DUR" =~ ^[1-9][0-9]*$ ]] ||
   ! [[ "$NOMBRE" =~ ^[a-zA-Z0-9_-]+$ ]]; then
  echo "Duración o nombre inválido."
  exit 1
fi

# Preparar archivos
mkdir -p results/captures

FECHA=$(date +%Y%m%d_%H%M%S)
ARCHIVO="${P}_${NOMBRE}_${FECHA}.pcapng"
CONTENEDOR="captura-${P}-${FECHA}-$$"

echo "Iniciando captura de $P..."

# Ejecutar TShark compartiendo la red del servidor
MSYS_NO_PATHCONV=1 docker run -d \
  --name "$CONTENEDOR" \
  --network "container:$SERVER" \
  --cap-add NET_RAW \
  --cap-add NET_ADMIN \
  --user 0:0 \
  -v "$(pwd -W)/results/captures:/captures" \
  --entrypoint tshark \
  cincan/tshark:latest \
  -i eth0 \
  -f "$FILTRO" \
  -F pcapng \
  -a "duration:$DUR" \
  -w "/captures/$ARCHIVO" > /dev/null || exit 1

# Eliminar el contenedor auxiliar al finalizar
trap 'docker rm -f "$CONTENEDOR" >/dev/null 2>&1 || true' EXIT

# Esperar a que TShark confirme el inicio
INICIADO=0

for i in $(seq 1 40); do
  if docker logs "$CONTENEDOR" 2>&1 | grep -q "Capture started"; then
    INICIADO=1
    break
  fi
  sleep 0.25
done

if [ "$INICIADO" -ne 1 ]; then
  echo "Error: TShark no inició correctamente."
  docker logs "$CONTENEDOR"
  exit 1
fi

echo "Captura iniciada. Ejecutando prueba..."

# Ejecutar el comando de carga recibido
"$@"
ESTADO_PRUEBA=$?

# Esperar a que TShark cierre la captura
ESTADO_CAPTURA=$(docker wait "$CONTENEDOR")

docker logs "$CONTENEDOR"

if [ "$ESTADO_CAPTURA" != "0" ]; then
  echo "Error al finalizar TShark."
  exit 1
fi

RUTA="results/captures/$ARCHIVO"

if [ ! -s "$RUTA" ]; then
  echo "Error: no se generó una captura válida."
  exit 1
fi

echo "Captura guardada: $RUTA"

if [ "$ESTADO_PRUEBA" -ne 0 ]; then
  echo "Advertencia: la prueba terminó con error."
  exit "$ESTADO_PRUEBA"
fi
