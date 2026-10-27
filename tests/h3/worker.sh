
#!/bin/sh

BASE="https://$HOST:443"

# Configurar método HTTP
if [ "$M" = "post" ]; then

  URL="$BASE/api/archivos"

  # Generar cuerpo de la solicitud POST
  dd if=/dev/zero bs="$SIZE" count=1 2>/dev/null \
    | tr '\0' 'x' > /tmp/body

  # Configuración para POST
  {
    echo 'data-binary = "@/tmp/body"'
    echo 'header = "Content-Type: application/octet-stream"'
  } > /tmp/cfg

else

  URL="$BASE/api/archivos/$SIZE"

  # Configuración para GET
  : > /tmp/cfg

fi

# Preparar una solicitud por ejecución de curl
echo 'output = "/dev/null"' >> /tmp/cfg
echo "url = \"$URL\"" >> /tmp/cfg

# Señal de finalización de la prueba
STOP_FILE=/tmp/h3_stop
rm -f "$STOP_FILE"

( sleep "$DUR"; : > "$STOP_FILE" ) &

# Ejecutar usuarios virtuales en paralelo
for v in $(seq "$VUS"); do
  (
    PART="${OUT}.${v}.part"
    : > "$PART"

    # No iniciar nuevas solicitudes al finalizar el tiempo
    while [ ! -f "$STOP_FILE" ]; do
      curl -k -sS "$FLAG" \
        -K /tmp/cfg \
        --max-time "$((DUR + 10))" \
        -w '%{http_version} %{http_code} %{time_total} %{size_download} %{size_upload}\n' \
        >> "$PART" 2>> "${OUT}.${v}.err" || true
    done
  ) &
done

# Esperar que terminen las solicitudes activas
wait

# Unificar resultados
: > "${OUT}.raw"

for part in "${OUT}".*.part; do
  [ -f "$part" ] && cat "$part" >> "${OUT}.raw"
done

rm -f "${OUT}".*.part