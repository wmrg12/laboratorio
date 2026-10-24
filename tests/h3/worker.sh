
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

# Preparar múltiples solicitudes para cada usuario virtual
for i in $(seq 5000); do
  echo 'output = "/dev/null"'
  echo "url = \"$URL\""
done >> /tmp/cfg

# Ejecutar usuarios virtuales en paralelo
for v in $(seq "$VUS"); do

  timeout "$DUR" curl \
    -k \
    -s \
    "$FLAG" \
    -K /tmp/cfg \
    -w '%{stderr}%{http_version} %{http_code} %{time_total} %{size_download} %{size_upload}\n' \
    2> "${OUT}.${v}.part" &

done

# Esperar a que finalicen todos los procesos
wait

# Crear archivo de resultados vacío
: > "${OUT}.raw"

# Unir resultados respetando los saltos de línea
for part in "${OUT}".*.part; do

  if [ -f "$part" ]; then
    awk 'NF { print }' "$part" >> "${OUT}.raw"
  fi

done

# Eliminar archivos temporales de cada usuario
rm -f "${OUT}".*.part
