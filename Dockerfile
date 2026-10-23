FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
# Build-only values: needed while Next.js collects route metadata.
# This stage is not the runtime image; real credentials are supplied via Compose.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=file:./build.db \
    APP_ORIGIN=http://localhost:3000 \
    NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
    CSRF_SECRET=build-time-placeholder-not-for-runtime-use-0123456789
RUN npm run db:generate && npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends openssl sqlite3 && rm -rf /var/lib/apt/lists/* \
  && groupadd -g 1001 blog && useradd -u 1001 -g blog -m blog && mkdir -p /data/uploads && chown -R blog:blog /data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/content ./content
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/src/lib/password.ts ./src/lib/password.ts
COPY --from=build /app/src/lib/validation.ts ./src/lib/validation.ts
COPY --from=build /app/src/config ./src/config
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER blog
EXPOSE 3000
CMD ["node", "server.js"]
