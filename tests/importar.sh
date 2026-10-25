#!/usr/bin/env bash
# Uso: ./tests/importar.sh [--api <url>] [--dir <directorio_results>]
#
# Importa al dashboard los resultados JSON ya generados en results/
# sin necesidad de volver a ejecutar las pruebas.
#
# Lee:
#   results/http*_*.json         → generados por k6
#   results/curl_http*_*.json    → generados por el runner h3/curl

set -euo pipefail

# ─── Parámetros ────────────────────────────────────────────────────────────────
# NOTA: El backend escucha en :3000 y expone /resultados directamente.
#       El prefijo /api lo agrega Nginx — NO se usa aquí.
API_URL="http://localhost:3000"
RESULTS_DIR="results"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --api) API_URL="$2"; shift 2 ;;
    --dir) RESULTS_DIR="$2"; shift 2 ;;
    *) echo "Opción desconocida: $1"; exit 1 ;;
  esac
done

GRN="\033[32m"; YLW="\033[33m"; RED="\033[31m"; BLU="\033[34m"; RST="\033[0m"
info()  { echo -e "${BLU}[INFO]${RST}  $*"; }
ok()    { echo -e "${GRN}[OK]${RST}    $*"; }
warn()  { echo -e "${YLW}[WARN]${RST}  $*"; }
error() { echo -e "${RED}[ERROR]${RST} $*" >&2; }

# ─── Verificar dependencias ────────────────────────────────────────────────────
# jq es opcional; usamos Python como fallback para parsear JSON.
if command -v jq &>/dev/null; then
  HAVE_JQ=1
elif command -v python &>/dev/null || command -v python3 &>/dev/null; then
  HAVE_JQ=0
  info "jq no encontrado; usando Python como fallback para JSON."
else
  error "Se requiere jq o Python para parsear los resultados."
  error "Instalá jq con: winget install jqlang.jq"
  exit 1
fi

# Leer un campo de un archivo JSON usando jq o Python.
# Uso: json_get <archivo> <ruta_jq> [default]
# Ejemplo: json_get file.json ".metrics.http_req_duration.avg" 0
json_get() {
  local file="$1" query="$2" default="${3:-0}"
  if [[ "$HAVE_JQ" -eq 1 ]]; then
    jq -r "$query // $default" "$file" 2>/dev/null
  else
    python -c "
import json, sys
try:
    d = json.load(open('$file'))
    keys = '$query'.lstrip('.').split('.')
    for k in keys:
        if isinstance(d, dict) and k in d:
            d = d[k]
        else:
            d = $default
            break
    print(d)
except Exception:
    print($default)
" 2>/dev/null
  fi
}

# ─── Función: enviar resultado a la API ───────────────────────────────────────
subir() {
  local payload="$1" label="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${API_URL}/resultados" \
    -H "Content-Type: application/json" \
    -d "$payload") || { warn "$label — sin conexión con $API_URL"; return 1; }

  if [[ "$code" == "200" || "$code" == "201" ]]; then
    ok "$label → HTTP $code"
    return 0
  else
    warn "$label → HTTP $code (payload: $payload)"
    return 1
  fi
}

TOTAL=0; EXITOSAS=0; FALLIDAS=0

echo ""
echo -e "${BLU}╔══════════════════════════════════════════════════════════════╗${RST}"
echo -e "${BLU}║        IMPORTACIÓN DE RESULTADOS — HU-18                     ║${RST}"
echo -e "${BLU}║  API: ${API_URL}/resultados$(printf '%*s' $((29 - ${#API_URL})) '')║${RST}"
echo -e "${BLU}╚══════════════════════════════════════════════════════════════╝${RST}"
echo ""

# ─── Importar resultados de k6 (http1 / http2) ────────────────────────────────
# Nombre esperado: {http1|http2}_{get|post}_{N}vus_{S}b.json
for f in "$RESULTS_DIR"/http[12]_*.json; do
  [[ -f "$f" ]] || continue

  fname=$(basename "$f" .json)

  # Parsear con regex: protocolo_metodo_Nvus[_Sb]
  if ! [[ "$fname" =~ ^(http[12])_([a-z]+)_([0-9]+)vus(_([0-9]+)b)?$ ]]; then
    warn "Nombre de archivo no reconocido: $fname — omitido"
    continue
  fi

  raw_proto="${BASH_REMATCH[1]}"
  raw_metodo="${BASH_REMATCH[2]}"
  vus="${BASH_REMATCH[3]}"
  size="${BASH_REMATCH[5]:-102400}"  # default 100KB si no hay tamaño

  case "$raw_proto" in
    http1) proto_api="http/1.1" ;;
    http2) proto_api="h2" ;;
    *)     warn "Protocolo desconocido en $fname"; continue ;;
  esac

  metodo_api="${raw_metodo^^}"  # a mayúsculas

  # Extraer métricas del JSON de k6
  lat=$(json_get "$f" ".metrics.http_req_duration.avg" 0) || lat=0
  [[ "$lat" =~ ^[0-9] ]] || lat=0

  rps=$(json_get "$f" ".metrics.http_reqs.rate" 0) || rps=0
  [[ "$rps" =~ ^[0-9] ]] || rps=0

  # throughput en MB/s
  throughput=$(awk -v r="$rps" -v s="$size" 'BEGIN { printf "%.4f", r * s / 1e6 }')
  lat=$(awk -v l="$lat" 'BEGIN { printf "%.2f", l }')

  payload=$(printf \
    '{"protocolo":"%s","metodo":"%s","tamano_bytes":%s,"concurrencia":%s,"conexiones":%s,"latencia_ms":%s,"throughput":%s,"origen":"importado_k6"}' \
    "$proto_api" "$metodo_api" "$size" "$vus" "$vus" "$lat" "$throughput")

  TOTAL=$((TOTAL + 1))
  info "$fname  → proto=$proto_api  met=$metodo_api  vus=$vus  lat=${lat}ms  tp=${throughput}MB/s"
  if subir "$payload" "$fname"; then
    EXITOSAS=$((EXITOSAS + 1))
  else
    FALLIDAS=$((FALLIDAS + 1))
  fi
done

# ─── Importar resultados de curl/h3 ───────────────────────────────────────────
# Nombre esperado: curl_{http1|http2|http3}_{get|post}_{N}vus_{S}b.json
for f in "$RESULTS_DIR"/curl_http*.json; do
  [[ -f "$f" ]] || continue

  fname=$(basename "$f" .json)

  # Parsear con regex: curl_protocolo_metodo_Nvus_Sb
  if ! [[ "$fname" =~ ^curl_(http[123])_([a-z]+)_([0-9]+)vus_([0-9]+)b$ ]]; then
    warn "Nombre de archivo no reconocido: $fname — omitido"
    continue
  fi

  raw_proto="${BASH_REMATCH[1]}"
  raw_metodo="${BASH_REMATCH[2]}"
  vus="${BASH_REMATCH[3]}"
  size="${BASH_REMATCH[4]}"

  case "$raw_proto" in
    http1) proto_api="http/1.1" ;;
    http2) proto_api="h2" ;;
    http3) proto_api="h3" ;;
    *)     warn "Protocolo desconocido en $fname"; continue ;;
  esac

  metodo_api="${raw_metodo^^}"

  # Extraer métricas del JSON del runner curl/h3
  lat=$(json_get "$f" ".lat_avg_ms" 0) || lat=0
  [[ "$lat" =~ ^[0-9] ]] || lat=0

  throughput=$(json_get "$f" ".mb_s" 0) || throughput=0
  [[ "$throughput" =~ ^[0-9] ]] || throughput=0

  lat=$(awk -v l="$lat" 'BEGIN { printf "%.2f", l }')
  throughput=$(awk -v t="$throughput" 'BEGIN { printf "%.4f", t }')

  payload=$(printf \
    '{"protocolo":"%s","metodo":"%s","tamano_bytes":%s,"concurrencia":%s,"conexiones":%s,"latencia_ms":%s,"throughput":%s,"origen":"importado_curl"}' \
    "$proto_api" "$metodo_api" "$size" "$vus" "$vus" "$lat" "$throughput")

  TOTAL=$((TOTAL + 1))
  info "$fname  → proto=$proto_api  met=$metodo_api  vus=$vus  lat=${lat}ms  tp=${throughput}MB/s"
  if subir "$payload" "$fname"; then
    EXITOSAS=$((EXITOSAS + 1))
  else
    FALLIDAS=$((FALLIDAS + 1))
  fi
done

# ─── Resumen ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLU}════════════════════════════════════════${RST}"
echo -e "  Archivos procesados : ${TOTAL}"
echo -e "  ${GRN}Importados          : ${EXITOSAS}${RST}"
[[ "$FALLIDAS" -gt 0 ]] && echo -e "  ${RED}Fallidos            : ${FALLIDAS}${RST}"
echo -e "${BLU}════════════════════════════════════════${RST}"
echo ""
if [[ "$EXITOSAS" -gt 0 ]]; then
  echo -e "  Abrí el dashboard y hacé clic en Actualizar."
fi
echo ""

[[ "$FALLIDAS" -gt 0 ]] && exit 1 || exit 0
