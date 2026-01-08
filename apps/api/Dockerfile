FROM oven/bun:1.1.26 AS base
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install
COPY . .
RUN bun run build

FROM oven/bun:1.1.26
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/src ./src
RUN bun install --production
EXPOSE 3000
CMD ["bun", "dist/index.js"]
