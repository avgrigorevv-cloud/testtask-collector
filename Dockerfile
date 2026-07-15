FROM node:20-bookworm-slim AS builder

WORKDIR /app

# better-sqlite3 and Prisma's engine need to compile/fetch native binaries
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
# cap V8 heap so `next build` fails loudly on OOM instead of letting the
# host's OOM-killer silently kill the process on low-memory hosts
ENV NODE_OPTIONS=--max-old-space-size=896
RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

# openssl/ca-certificates needed at runtime by Prisma's engine; no compilers here
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

ENV NODE_ENV=production
EXPOSE 3000

# prisma/dev.db and public/uploads must be on a mounted volume — see README "Деплой"
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
