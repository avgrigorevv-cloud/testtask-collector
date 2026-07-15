FROM node:20-bookworm-slim

WORKDIR /app

# better-sqlite3 and Prisma's engine need to compile/fetch native binaries
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# prisma/dev.db and public/uploads must be on a mounted volume — see README "Деплой"
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
