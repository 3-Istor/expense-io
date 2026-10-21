# syntax=docker/dockerfile:1.7
# Image de production d'Expense.io, en trois étapes : dépendances, build, exécution.
# Build reproductible sans Internet côté app (polices locales). Exécution sans root, dépendances de prod seulement.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY --from=build /app/next.config.ts ./next.config.ts
# Données OCR (tesseract) ; migrations et scripts pour migrer et peupler depuis l'image.
COPY tessdata ./tessdata
COPY migrations ./migrations
COPY scripts/migrate.mjs scripts/seed.mjs scripts/ensure-bucket.mjs ./scripts/
# Utilisateur « node » de l'image officielle (uid 1000), jamais root.
USER 1000:1000
EXPOSE 3000
# Sonde sans nouvel endpoint (contrat gelé) : la page de connexion répond 200 quand l'app est prête.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
# Binaire appelé directement (pas npx, qui écrirait un cache) : compatible avec un système de fichiers en lecture seule.
CMD ["node", "node_modules/next/dist/bin/next", "start"]
