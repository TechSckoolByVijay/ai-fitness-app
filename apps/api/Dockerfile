# Build context is the monorepo root (needs the @fitness-app/shared workspace).
# Runs via tsx (same as local dev) rather than a tsc-compiled dist/ — the
# shared package ships as raw TypeScript (consumed directly by both this API
# and the mobile app's Metro bundler), so a plain `node dist/server.js`
# can't resolve it without a separate build step for packages/shared too.
# At this app's scale (a handful of users) tsx's small transpile-on-boot
# overhead is irrelevant; simplicity and matching the already-proven dev
# execution path outweigh a leaner production image.
FROM node:24-slim

# Prisma's query engine needs OpenSSL present on Debian-slim.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --workspace=apps/api --workspace=packages/shared

COPY packages/shared packages/shared
COPY apps/api apps/api

WORKDIR /app/apps/api
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npx", "tsx", "src/server.ts"]
