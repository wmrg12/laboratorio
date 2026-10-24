#!/bin/bash
# Uso: ./netem/netem.sh aplicar <latencia|perdida|mixto> | quitar | ver

SERVIDORES="laboratorio-web-http1-1 laboratorio-web-http2-1 laboratorio-web-http3-1"

tcx() {  # ejecuta tc dentro de la red de un contenedor
  MSYS_NO_PATHCONV=1 docker run --rm --cap-add NET_ADMIN \
    --network container:"$1" nicolaka/netshoot tc "${@:2}"
}

for c in $SERVIDORES; do
  echo "== $c"
  case "$1" in
    aplicar)
      case "$2" in
        latencia) tcx $c qdisc replace dev eth0 root netem delay 100ms 10ms ;;
        perdida)  tcx $c qdisc replace dev eth0 root netem loss 2% ;;
        mixto)    tcx $c qdisc replace dev eth0 root netem delay 100ms 10ms loss 2% ;;
        *) echo "Perfil desconocido: $2"; exit 1 ;;
      esac ;;
    quitar) tcx $c qdisc del dev eth0 root ;;
    ver)    tcx $c qdisc show dev eth0 ;;
    *) echo "Uso: aplicar <perfil> | quitar | ver"; exit 1 ;;
  esac
done