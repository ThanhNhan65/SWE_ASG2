FROM node:20-alpine

WORKDIR /app

# Prisma engine cần openssl trên Alpine Linux
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run db:seed && node dist/main.js"]
