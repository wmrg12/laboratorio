
#!/bin/bash
# Uso: ./tests/h3/run.sh <get|post> <vus> [tamaño_bytes] [duración_s] [http1|http2|http3]

set -e

M=$1
VUS=$2
SIZE=${3:-102400}
DUR=${4:-10}
P=${5:-http3}

# Validar parametros
if [[ "$M" != "get" && "$M" != "post" ]]; then
  echo "Método inválido. Usa get o post."
  exit 1
fi

if ! [[ "$VUS" =~ ^[1-9][0-9]*$ &&
        "$SIZE" =~ ^[1-9][0-9]*$ &&
        "$DUR" =~ ^[1-9][0-9]*$ ]]; then
  echo "VUS, tamaño y duración deben ser enteros positivos."
  exit 1
fi

# Configurar protocolo
case "$P" in
  http1)
    HOST=web-http1
    FLAG=--http1.1
    VER=1.1
    ;;
  http2)
    HOST=web-http2
    FLAG=--http2
    VER=2
    ;;
  http3)
    HOST=web-http3
    FLAG=--http3-only
    VER=3
    ;;
  *)
    echo "Protocolo desconocido: $P"
    exit 1
    ;;
esac

# GET mide bytes descargados
# POST mide bytes enviados
if [ "$M" = "post" ]; then
  COL=5
else
  COL=4
fi

OUT="results/curl_${P}_${M}_${VUS}vus_${SIZE}b"

mkdir -p results
rm -f "${OUT}".*

# Ejecutar prueba dentro de Docker
MSYS_NO_PATHCONV=1 docker run --rm -i \
  --network laboratorio_lab-net \
  -v "$(pwd -W)/results:/results" \
  -e M="$M" \
  -e VUS="$VUS" \
  -e SIZE="$SIZE" \
  -e DUR="$DUR" \
  -e OUT="/$OUT" \
  -e HOST="$HOST" \
  -e FLAG="$FLAG" \
  --entrypoint sh ymuski/curl-http3 -s \
  < tests/h3/worker.sh

# Verificar que se hayan generado resultados
if [ ! -f "${OUT}.raw" ]; then
  echo "Error: no se generó ${OUT}.raw"
  exit 1
fi

# Filtrar registros con formato válido
awk '
  NF == 5 &&
  ($1 == "0" || $1 == "1.1" || $1 == "2" || $1 == "3") &&
  $2 ~ /^[0-9][0-9][0-9]$/ &&
  $3 ~ /^[0-9]+([.][0-9]+)?$/ &&
  $4 ~ /^[0-9]+$/ &&
  $5 ~ /^[0-9]+$/ {
    print
  }
' "${OUT}.raw" > "${OUT}.valid"

# Contar registros válidos e inválidos
TOTAL=$(wc -l < "${OUT}.raw" | tr -d ' ')
VALID=$(wc -l < "${OUT}.valid" | tr -d ' ')
INVALID=$((TOTAL - VALID))

# Obtener latencias solo de respuestas exitosas
# que utilizaron el protocolo solicitado
awk -v v="$VER" '
  $1 == v && $2 == 200 {
    print $3 * 1000
  }
' "${OUT}.valid" | sort -n > "${OUT}.lat"

N=$(wc -l < "${OUT}.lat" | tr -d ' ')

if [ "$N" -eq 0 ]; then
  echo "Sin respuestas exitosas para $P."
  echo "Revisa ${OUT}.raw y ${OUT}.valid"
  exit 1
fi

# Contar respuestas HTTP no exitosas
FAIL=$(awk '
  $2 != 200 { n++ }
  END { print n+0 }
' "${OUT}.valid")

# Contar respuestas exitosas con otro protocolo
OTRO=$(awk -v v="$VER" '
  $2 == 200 && $1 != v { n++ }
  END { print n+0 }
' "${OUT}.valid")

# Calcular bytes transferidos correctamente
BYTES=$(awk -v v="$VER" -v c="$COL" '
  $1 == v && $2 == 200 {
    b += $c
  }
  END { print b+0 }
' "${OUT}.valid")

# Latencia promedio en milisegundos
AVG=$(awk '
  { s += $1 }
  END { printf "%.2f", s/NR }
' "${OUT}.lat")

# Percentil 95 
P95=$(awk -v n="$N" '
  BEGIN {
    k = int((n*95+99)/100)
  }
  NR == k {
    print
    exit
  }
' "${OUT}.lat")

# Latencia máxima
MAX=$(tail -1 "${OUT}.lat")

# Solicitudes exitosas por segundo
RPS=$(awk -v n="$N" -v e="$DUR" '
  BEGIN { printf "%.1f", n/e }
')

# Megabytes por segundo
MBS=$(awk -v b="$BYTES" -v e="$DUR" '
  BEGIN { printf "%.1f", b/e/1e6 }
')

# Guardar resultados en JSON
printf '{"protocolo":"%s","metodo":"%s","vus":%s,"tamano_bytes":%s,"duracion_s":%s,"reqs":%s,"fallidas":%s,"otro_protocolo":%s,"registros_invalidos":%s,"rps":%s,"lat_avg_ms":%s,"lat_p95_ms":%s,"lat_max_ms":%s,"mb_s":%s}\n' \
  "$P" "$M" "$VUS" "$SIZE" "$DUR" \
  "$N" "$FAIL" "$OTRO" "$INVALID" \
  "$RPS" "$AVG" "$P95" "$MAX" "$MBS" \
  | tee "${OUT}.json"

# Eliminar archivo temporal de latencias
rm -f "${OUT}.lat"
