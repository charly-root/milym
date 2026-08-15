FROM node:22-alpine

WORKDIR /app

# better-sqlite3 nécessite des outils de compilation natifs
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Évite la boucle HSTS / upgrade-insecure-requests sans HTTPS prêt
RUN node patch-helmet.js

# Compiler Tailwind et l'expérience 3D, puis retirer les deps de build/dev
RUN npm run build:css \
  && npm run build:experience \
  && npm prune --omit=dev \
  && apk del python3 make g++

# Conserver les sources data/ et logos pour les réinjecter si un volume masque le dossier
RUN mkdir -p /opt/milym-data-src /opt/milym-logos-src \
  && cp /app/data/db.js /app/data/seed.js /opt/milym-data-src/ \
  && cp -a /app/public/logos/. /opt/milym-logos-src/

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "app.js"]
