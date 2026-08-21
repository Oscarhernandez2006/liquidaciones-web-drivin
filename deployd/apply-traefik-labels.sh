#!/usr/bin/env bash
# ===========================================================================
#  apply-traefik-labels.sh
#  Aplica las labels de Traefik al servicio Swarm del portal de liquidaciones.
#  Uso (en el servidor por SSH):
#      chmod +x deployd/apply-traefik-labels.sh
#      ./deployd/apply-traefik-labels.sh
#
#  NOTA: estas labels se pierden si Dokploy hace un "Redeploy" desde el panel.
#  Vuelve a correr este script tras cada redeploy, o configura el dominio en
#  Dokploy (Domains -> Container Port 5462, HTTPS, Let's Encrypt).
# ===========================================================================
set -euo pipefail

# --- Parámetros ------------------------------------------------------------
SERVICE="liquidaciondrivinweb-webliquidaciondomi-nnuv8l"
DOMAIN="mivariableliquidacion.grupo-santacruz.com"
PORT="5462"
ROUTER="liqdrivin"
CERTRESOLVER="letsencrypt"
# ---------------------------------------------------------------------------

echo ">> Aplicando labels de Traefik al servicio: $SERVICE"

docker service update \
  --label-add "traefik.enable=true" \
  --label-add "traefik.http.routers.${ROUTER}.rule=Host(\`${DOMAIN}\`)" \
  --label-add "traefik.http.routers.${ROUTER}.entrypoints=websecure" \
  --label-add "traefik.http.routers.${ROUTER}.tls=true" \
  --label-add "traefik.http.routers.${ROUTER}.tls.certresolver=${CERTRESOLVER}" \
  --label-add "traefik.http.routers.${ROUTER}.service=${ROUTER}" \
  --label-add "traefik.http.services.${ROUTER}.loadbalancer.server.port=${PORT}" \
  --label-add "traefik.http.routers.${ROUTER}-http.rule=Host(\`${DOMAIN}\`)" \
  --label-add "traefik.http.routers.${ROUTER}-http.entrypoints=web" \
  --label-add "traefik.http.routers.${ROUTER}-http.service=${ROUTER}" \
  --label-add "traefik.http.routers.${ROUTER}-http.middlewares=${ROUTER}-redirect" \
  --label-add "traefik.http.middlewares.${ROUTER}-redirect.redirectscheme.scheme=https" \
  "$SERVICE"

echo ">> Listo. Esperando a que Traefik registre el router..."
sleep 15

echo ">> Verificando respuesta:"
echo -n "   HTTP  : "; curl -sI -H "Host: ${DOMAIN}" http://localhost | head -1 || true
echo -n "   HTTPS : "; curl -skI "https://${DOMAIN}" | head -1 || true
