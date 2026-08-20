# ===========================================================================
#  Dockerfile para el portal web (Next.js 14, salida standalone)
#  Build:  docker build -t liquidaciones-web .
#  Run:    docker run -p 3000:3000 --env-file .env.local liquidaciones-web
#  Las variables (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD, PGSSL) se
#  inyectan en tiempo de EJECUCIÓN desde el panel del servidor, NO se copian.
# ===========================================================================

# ---- 1) Dependencias ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- 2) Compilación ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 3) Ejecución (imagen final, mínima) ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario sin privilegios
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Solo lo necesario para correr: standalone + estáticos + public
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
# Necesario para que escuche en todas las interfaces dentro del contenedor.
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
