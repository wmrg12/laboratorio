#!/usr/bin/env bash
# Uso: ./tests/netem/netem.sh aplicar <latencia|perdida|mixto|ninguno>
#      ./tests/netem/netem.sh quitar
#
# Aplica emulación de red (tc netem) a los contenedores de los servidores web
# para evaluar HTTP/1.1, HTTP/2 y HTTP/3 bajo condiciones degradadas.

set -euo pipefail

COMANDO="${1:-}"
PERFIL="${2:-ninguno}"

# Contenedores a los que se aplica la emulación.
# Se pueden sobreescribir con la variable NETEM_CONTAINERS.
CONTAINERS=(
  laboratorio-web-http1-1
  laboratorio-web-http2-1
  laboratorio-web-http3-1
)
if [[ -n "${NETEM_CONTAINERS:-}" ]]; then
  IFS=' ' read -r -a CONTAINERS <<< "$NETEM_CONTAINERS"
fi

# Imagen local con tc/iproute2
NETEM_IMAGE="lab/netem"
NETEM_DOCKERFILE="$(dirname "$0")/Dockerfile"

# Interfaz de red dentro del contenedor (casi siempre eth0)
IFACE="${NETEM_IFACE:-eth0}"

# Colores
GRN="\033[32m"; YLW="\033[33m"; RED="\033[31m"; BLU="\033[34m"; RST="\033[0m"
info()  { echo -e "${BLU}[INFO]${RST}  $*"; }
ok()    { echo -e "${GRN}[OK]${RST}    $*"; }
warn()  { echo -e "${YLW}[WARN]${RST}  $*"; }
error() { echo -e "${RED}[ERROR]${RST} $*" >&2; }

# Verificar dependencias
if ! command -v docker &>/dev/null; then
  error "Docker no está disponible."
  exit 1
fi

# Verificar comando
if [[ "$COMANDO" != "aplicar" && "$COMANDO" != "quitar" ]]; then
  echo "Uso: $0 aplicar <latencia|perdida|mixto|ninguno>"
  echo "     $0 quitar"
  exit 1
fi

# Construir imagen local si no existe
if ! docker image inspect "$NETEM_IMAGE" >/dev/null 2>&1; then
  info "Construyendo imagen local $NETEM_IMAGE..."
  docker build -t "$NETEM_IMAGE" -f "$NETEM_DOCKERFILE" "$(dirname "$NETEM_DOCKERFILE")"
fi

# Traducir perfil a reglas netem
netem_rule() {
  case "$PERFIL" in
    latencia)
      # 100 ms de retardo con ±20 ms de jitter, distribución normal
      echo "delay 100ms 20ms distribution normal"
      ;;
    perdida)
      # 5% de pérdida de paquetes
      echo "loss 5%"
      ;;
    mixto)
      # Latencia + pérdida leve
      echo "delay 80ms 15ms distribution normal loss 3%"
      ;;
    ninguno)
      echo ""
      ;;
    *)
      error "Perfil inválido: $PERFIL. Usa latencia, perdida, mixto o ninguno."
      exit 1
      ;;
  esac
}

# Ejecutar tc dentro de un contenedor temporal conectado a la red del objetivo
run_tc() {
  local container="$1"
  shift
  MSYS_NO_PATHCONV=1 docker run --rm \
    --privileged \
    --network "container:$container" \
    --entrypoint /sbin/tc \
    "$NETEM_IMAGE" \
    "$@" 2>&1 || true
}

# Aplicar perfil a un contenedor
aplicar_a() {
  local container="$1"
  local rule
  rule=$(netem_rule)

  if [[ -z "$rule" ]]; then
    info "$container → perfil 'ninguno'; no se aplica ninguna regla"
    return 0
  fi

  info "$container → aplicando netem: $rule"

  # 'replace' crea o reemplaza el qdisc root sin importar qué haya antes
  local out
  out=$(run_tc "$container" qdisc replace dev "$IFACE" root netem $rule)

  if [[ -n "$out" && ! "$out" =~ ^[[:space:]]*$ ]]; then
    warn "$container → $out"
  else
    ok "$container → netem aplicado"
  fi
}

# Quitar netem de un contenedor
quitar_de() {
  local container="$1"
  info "$container → quitando netem"
  run_tc "$container" qdisc del dev "$IFACE" root netem >/dev/null 2>&1 || true
  ok "$container → netem removido"
}

# ─── MAIN ─────────────────────────────────────────────────────────────────────
if [[ "$COMANDO" == "aplicar" ]]; then
  if [[ "$PERFIL" == "ninguno" ]]; then
    info "Perfil 'ninguno' seleccionado; se recomienda ejecutar 'quitar' para limpiar."
  fi

  for c in "${CONTAINERS[@]}"; do
    if ! docker ps --format '{{.Names}}' | grep -qx "$c"; then
      warn "Contenedor no encontrado o no está corriendo: $c"
      continue
    fi
    aplicar_a "$c"
  done

elif [[ "$COMANDO" == "quitar" ]]; then
  for c in "${CONTAINERS[@]}"; do
    if ! docker ps --format '{{.Names}}' | grep -qx "$c"; then
      warn "Contenedor no encontrado o no está corriendo: $c"
      continue
    fi
    quitar_de "$c"
  done
fi
