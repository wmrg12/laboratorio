#!/usr/bin/env bash
# Uso: ./tests/matriz.sh [--perfil <latencia|perdida|mixto|ninguno>] [--api <url>]
#
# Ejecuta la matriz completa de pruebas sobre los tres protocolos
# y sube cada resultado al dashboard vía la API REST del backend.
#
# Matriz:
#   Protocolos : http1 · http2 · http3
#   Métodos    : get · post
#   VUs        : 10 · 50 · 100
#   Tamaño     : 102400 bytes (100 KB)
#   Duración   : 20s por celda

set -euo pipefail

# ─── Parámetros ────────────────────────────────────────────────────────────────
PERFIL="ninguno"
API_URL="http://localhost:3000"
DUR=20
SIZE=102400

while [[ $# -gt 0 ]]; do
  case "$1" in
    --perfil) PERFIL="$2"; shift 2 ;;
    --api)    API_URL="$2"; shift 2 ;;
    --dur)    DUR="$2";     shift 2 ;;
    --size)   SIZE="$2";    shift 2 ;;
    *) echo "Opción desconocida: $1"; exit 1 ;;
  esac
done

# ─── Validaciones ──────────────────────────────────────────────────────────────
case "$PERFIL" in
  latencia|perdida|mixto|ninguno) ;;
  *) echo "Perfil inválido: $PERFIL. Usa latencia, perdida, mixto o ninguno."; exit 1 ;;
esac

# ─── Colores ───────────────────────────────────────────────────────────────────
GRN="\033[32m"; YLW="\033[33m"; RED="\033[31m"; BLU="\033[34m"; RST="\033[0m"
info()    { echo -e "${BLU}[INFO]${RST}  $*"; }
ok()      { echo -e "${GRN}[OK]${RST}    $*"; }
warn()    { echo -e "${YLW}[WARN]${RST}  $*"; }
error()   { echo -e "${RED}[ERROR]${RST} $*" >&2; }

# ─── Configuración de red ──────────────────────────────────────────────────────
aplicar_perfil() {
  if [[ "$PERFIL" != "ninguno" ]]; then
    info "Aplicando perfil de red: $PERFIL"
    bash "$(dirname "$0")/../netem/netem.sh" aplicar "$PERFIL"
  fi
}

quitar_perfil() {
  if [[ "$PERFIL" != "ninguno" ]]; then
    info "Quitando perfil de red..."
    bash "$(dirname "$0")/../netem/netem.sh" quitar 2>/dev/null || true
  fi
}
trap quitar_perfil EXIT

# ─── Función: subir resultado al dashboard ─────────────────────────────────────
# $1=protocolo_api(http/1.1|h2|h3) $2=metodo(GET|POST) $3=tamano $4=vus
# $5=latencia_ms $6=throughput_mbs $7=origen
subir_resultado() {
  local proto="$1" metodo="$2" tamano="$3" vus="$4"
  local latencia="$5" throughput="$6" origen="${7:-script}"

  local payload
  payload=$(printf \
    '{"protocolo":"%s","metodo":"%s","tamano_bytes":%s,"concurrencia":%s,"conexiones":%s,"latencia_ms":%s,"throughput":%s,"origen":"%s"}' \
    "$proto" "$metodo" "$tamano" "$vus" "$vus" "$latencia" "$throughput" "$origen")

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${API_URL}/resultados" \
    -H "Content-Type: application/json" \
    -d "$payload") || { warn "No se pudo conectar con la API ($API_URL)"; return 1; }

  if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
    ok "  → Resultado subido (HTTP $http_code)"
  else
    warn "  → API respondió HTTP $http_code"
  fi
}

# ─── Función: ejecutar celda HTTP/1.1 o HTTP/2 con k6 ─────────────────────────
ejecutar_k6() {
  local p="$1" m="$2" vus="$3"
  local dur_k6="${DUR}s"

  info "k6  ${p}  ${m}  ${vus}vus  ${SIZE}B  ${dur_k6}"

  local result_file="results/${p}_${m}_${vus}vus_${SIZE}b.json"
  mkdir -p results

  bash tests/k6/run.sh "$p" "$m" "$vus" "$SIZE" "$dur_k6" || {
    warn "k6 falló para $p $m $vus VUs"
    return 1
  }

  if [[ ! -f "$result_file" ]]; then
    warn "Archivo de resultado no encontrado: $result_file"
    return 1
  fi

  # Extraer métricas del JSON de k6
  local lat throughput
  lat=$(python3 -c "
import json, sys
d = json.load(open('$result_file'))
print(round(d['metrics']['http_req_duration']['values']['avg'], 2))
" 2>/dev/null) || lat=0

  throughput=$(python3 -c "
import json, sys
d = json.load(open('$result_file'))
# bytes/s → MB/s
rps = d['metrics']['http_reqs']['values']['rate']
size = $SIZE
print(round(rps * size / 1e6, 2))
" 2>/dev/null) || throughput=0

  # Mapear protocolo al nombre de la API
  local proto_api
  case "$p" in
    http1) proto_api="http/1.1" ;;
    http2) proto_api="h2" ;;
  esac

  local metodo_api
  metodo_api=$(echo "$m" | tr '[:lower:]' '[:upper:]')

  subir_resultado "$proto_api" "$metodo_api" "$SIZE" "$vus" "$lat" "$throughput" "k6_${PERFIL}"
}

# ─── Función: ejecutar celda HTTP/3 con curl ───────────────────────────────────
ejecutar_h3() {
  local m="$1" vus="$2"

  info "h3  http3  ${m}  ${vus}vus  ${SIZE}B  ${DUR}s"

  local result_file="results/curl_http3_${m}_${vus}vus_${SIZE}b.json"
  mkdir -p results

  bash tests/h3/run.sh "$m" "$vus" "$SIZE" "$DUR" "http3" || {
    warn "h3 runner falló para $m $vus VUs"
    return 1
  }

  if [[ ! -f "$result_file" ]]; then
    warn "Archivo de resultado no encontrado: $result_file"
    return 1
  fi

  local lat throughput
  lat=$(python3 -c "
import json
d = json.load(open('$result_file'))
print(d.get('lat_avg_ms', 0))
" 2>/dev/null) || lat=0

  throughput=$(python3 -c "
import json
d = json.load(open('$result_file'))
print(d.get('mb_s', 0))
" 2>/dev/null) || throughput=0

  local metodo_api
  metodo_api=$(echo "$m" | tr '[:lower:]' '[:upper:]')

  subir_resultado "h3" "$metodo_api" "$SIZE" "$vus" "$lat" "$throughput" "curl_h3_${PERFIL}"
}

# ─── MAIN: Ejecutar matriz ─────────────────────────────────────────────────────
PROTOCOLOS_K6=("http1" "http2")
PROTOCOLOS_H3=("http3")
METODOS=("get" "post")
VUS_LIST=(10 50 100)

echo ""
echo -e "${BLU}╔══════════════════════════════════════════════════════════════╗${RST}"
echo -e "${BLU}║        MATRIZ DE PRUEBAS — Épica 4 / HU-18                  ║${RST}"
echo -e "${BLU}║  Protocolos: HTTP/1.1 · HTTP/2 · HTTP/3                     ║${RST}"
echo -e "${BLU}║  Métodos:    GET · POST                                      ║${RST}"
printf  "${BLU}║  VUs:        %-46s║${RST}\n" "${VUS_LIST[*]}"
printf  "${BLU}║  Tamaño:     %-46s║${RST}\n" "${SIZE} bytes"
printf  "${BLU}║  Duración:   %-46s║${RST}\n" "${DUR}s por celda"
printf  "${BLU}║  Perfil red: %-46s║${RST}\n" "$PERFIL"
printf  "${BLU}║  API:        %-46s║${RST}\n" "$API_URL"
echo -e "${BLU}╚══════════════════════════════════════════════════════════════╝${RST}"
echo ""

TOTAL=0
EXITOSAS=0
FALLIDAS=0

aplicar_perfil

for M in "${METODOS[@]}"; do
  echo -e "\n${YLW}▶ Método: $(echo $M | tr '[:lower:]' '[:upper:]')${RST}"

  for VUS in "${VUS_LIST[@]}"; do
    echo -e "\n  ${YLW}── VUs: $VUS${RST}"

    # HTTP/1.1 y HTTP/2 con k6
    for P in "${PROTOCOLOS_K6[@]}"; do
      TOTAL=$((TOTAL + 1))
      if ejecutar_k6 "$P" "$M" "$VUS"; then
        EXITOSAS=$((EXITOSAS + 1))
      else
        FALLIDAS=$((FALLIDAS + 1))
      fi
    done

    # HTTP/3 con curl
    for P in "${PROTOCOLOS_H3[@]}"; do
      TOTAL=$((TOTAL + 1))
      if ejecutar_h3 "$M" "$VUS"; then
        EXITOSAS=$((EXITOSAS + 1))
      else
        FALLIDAS=$((FALLIDAS + 1))
      fi
    done

  done
done

# ─── Resumen ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLU}════════════════════════════════════════${RST}"
echo -e "  Total de celdas : ${TOTAL}"
echo -e "  ${GRN}Exitosas         : ${EXITOSAS}${RST}"
[[ "$FALLIDAS" -gt 0 ]] && echo -e "  ${RED}Fallidas         : ${FALLIDAS}${RST}"
echo -e "${BLU}════════════════════════════════════════${RST}"
echo ""
echo -e "  Dashboard: ${API_URL/3000/5173}"
echo ""

[[ "$FALLIDAS" -gt 0 ]] && exit 1 || exit 0
