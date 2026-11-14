# Multi-stage Dockerfile for BrewLite Next.js Web PWA
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definitions
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm --prefix apps/web install

# Copy source code and build
COPY apps/web ./apps/web/
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm --prefix apps/web run build

# Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY apps/web/package*.json ./apps/web/
RUN npm --prefix apps/web install --omit=dev

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["npm", "--prefix", "apps/web", "run", "start"]
