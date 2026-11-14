# Multi-stage Dockerfile for BrewLite NestJS API
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definitions
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm --prefix apps/api install

# Generate Prisma Client
COPY apps/api/prisma ./apps/api/prisma/
RUN npx --prefix apps/api prisma generate --schema=apps/api/prisma/schema.prisma

# Copy source code and build
COPY apps/api ./apps/api/
RUN npm --prefix apps/api run build

# Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY apps/api/package*.json ./apps/api/
RUN npm --prefix apps/api install --omit=dev

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/apps/api/node_modules/@prisma ./apps/api/node_modules/@prisma
COPY apps/api/prisma ./apps/api/prisma/

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
