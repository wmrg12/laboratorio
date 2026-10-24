#!/bin/bash
# Uso: ./tests/k6/run.sh <http1|http2> <get|post> <vus> [tamaño_bytes] [duración]
P=$1; M=$2; VUS=$3; SIZE=${4:-102400}; DUR=${5:-10s}

case $P in
  http1) PROTO=HTTP/1.1 ;;
  http2) PROTO=HTTP/2.0 ;;
  *) echo "k6 no soporta este protocolo: $P"; exit 1 ;;
esac

mkdir -p results
MSYS_NO_PATHCONV=1 docker run --rm -i --network laboratorio_lab-net \
  -e BASE=https://web-$P:443 -e PROTO=$PROTO \
  -e VUS=$VUS -e SIZE=$SIZE -e DUR=$DUR \
  -v "$(pwd -W)/results:/results" \
  grafana/k6 run --quiet \
  --summary-export=/results/${P}_${M}_${VUS}vus_${SIZE}b.json \
  - < tests/k6/$M.js