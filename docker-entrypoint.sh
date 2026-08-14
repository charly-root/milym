#!/bin/sh
set -e

# Si un volume est monté sur /app/data, réinjecter le code JS sans écraser la DB
mkdir -p /app/data
cp /opt/milym-data-src/db.js /app/data/db.js
cp /opt/milym-data-src/seed.js /app/data/seed.js

# Préserver le logo par défaut si le volume logos est vide
mkdir -p /app/public/logos
if [ -d /opt/milym-logos-src ]; then
  for f in /opt/milym-logos-src/*; do
    [ -e "$f" ] || continue
    base=$(basename "$f")
    if [ ! -e "/app/public/logos/$base" ]; then
      cp "$f" "/app/public/logos/$base"
    fi
  done
fi

exec "$@"
