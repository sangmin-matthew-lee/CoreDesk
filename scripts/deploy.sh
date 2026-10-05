#!/bin/bash
set -e

# Source environment variables from ~/.env
if [ -f ~/.env ]; then
  set -a
  source ~/.env
  set +a
fi

TARGET_DOMAIN="${DOMAIN_NAME:-geicrm.duckdns.org}"
TARGET_EMAIL="${LETSENCRYPT_EMAIL:-admin@geicrm.duckdns.org}"

# Bootstrap SSL certificates using standalone Certbot if not present
if ! sudo test -d "certbot/conf/live/${TARGET_DOMAIN}"; then
  echo "SSL Certificates not found for ${TARGET_DOMAIN}. Bootstrapping via Certbot..."
  sudo docker compose down || true
  sudo docker run --rm \
    -p 80:80 \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly --standalone \
    --preferred-challenges http \
    --email "${TARGET_EMAIL}" \
    --agree-tos --no-eff-email \
    -d "${TARGET_DOMAIN}" \
    --keep-until-expiring -n
fi

# Pull new image
sudo docker compose pull

# Start/update the containers
sudo docker compose up -d --remove-orphans

# Restart nginx so it cleanly re-resolves the upstream web container IP
sudo docker compose restart nginx

# Prune old unused images to save disk space on e2-micro
sudo docker image prune -f
