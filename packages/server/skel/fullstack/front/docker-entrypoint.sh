#!/bin/sh
# Remplace dans index.html les marqueurs posés au build par les variables du
# conteneur. Joué au démarrage par le point d'entrée de l'image nginx.
#
# Seul index.html est touché : il est servi en no-cache, alors que les fichiers
# de assets/ sont nommés par leur hachage et mis en cache un an. Les réécrire
# ferait mentir leur nom.
set -eu

INDEX=/usr/share/nginx/html/index.html

# connect-src de la politique de sécurité ne connaît que des origines, pas des
# URL complètes. Vide si Faro est éteint, ce qui laisse la directive valide.
faro_origin=$(printf '%s' "${FARO_URL:-}" | sed -E 's#^([a-z]+://[^/]+).*#\1#')

# `|` comme séparateur : les valeurs sont des URL, qui contiennent des `/`.
sed -i \
  -e "s|__FARO_URL__|${FARO_URL:-}|g" \
  -e "s|__FARO_ORIGIN__|${faro_origin}|g" \
  -e "s|__FARO_SAMPLE__|${FARO_SAMPLE:-0.1}|g" \
  -e "s|__ENVIRONMENT__|${ENVIRONMENT:-production}|g" \
  "$INDEX"
