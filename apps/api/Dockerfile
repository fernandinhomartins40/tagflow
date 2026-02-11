FROM oven/bun:1.1.26 AS base
WORKDIR /app

ARG BUILD_DATE

COPY package.json bun.lockb* ./
RUN bun install
COPY . .
RUN echo "Building API with BUILD_DATE=${BUILD_DATE}" && bun run build

FROM oven/bun:1.1.26
WORKDIR /app

ARG BUILD_DATE
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.title="Tagflow API"
LABEL org.opencontainers.image.description="Tagflow backend API"

ENV NODE_ENV=production

COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/src ./src
RUN bun install --production

# Add wget for healthcheck
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

EXPOSE 3000
CMD ["bun", "dist/index.js"]
