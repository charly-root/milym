#!/bin/bash
# Met à jour le site depuis GitHub (branche main) et reconstruit si nécessaire.
set -euo pipefail

APP_DIR="/docker/milym-express"
BRANCH="main"
LOG_FILE="/var/log/milym-update.log"
LOCK_FILE="/var/lock/milym-update.lock"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$(date -Is) Mise à jour déjà en cours, abandon." >>"$LOG_FILE"
  exit 0
fi

cd "$APP_DIR"

echo "$(date -Is) Vérification des mises à jour (origin/$BRANCH)..." >>"$LOG_FILE"

git fetch origin "$BRANCH" --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "$(date -Is) Déjà à jour ($LOCAL)." >>"$LOG_FILE"
  exit 0
fi

echo "$(date -Is) Nouveau commit détecté : $LOCAL -> $REMOTE" >>"$LOG_FILE"

# Préserve les fichiers locaux de déploiement (non suivis par git)
git reset --hard "origin/$BRANCH"
git clean -fd --exclude=Dockerfile --exclude=docker-compose.yml \
  --exclude=docker-entrypoint.sh --exclude=update.sh \
  --exclude=patch-helmet.js --exclude=.env --exclude=persist --exclude=deploy

echo "$(date -Is) Reconstruction et redémarrage du conteneur..." >>"$LOG_FILE"
docker compose up -d --build >>"$LOG_FILE" 2>&1

echo "$(date -Is) Mise à jour terminée ($(git rev-parse --short HEAD))." >>"$LOG_FILE"
