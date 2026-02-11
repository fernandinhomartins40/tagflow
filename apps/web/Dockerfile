FROM oven/bun:1.1.26 AS base
WORKDIR /app

ARG BUILD_DATE
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL

COPY package.json bun.lockb* ./
RUN bun install
COPY . .
RUN echo "Building with BUILD_DATE=${BUILD_DATE}" && bun run build

FROM nginx:alpine

ARG BUILD_DATE
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.title="Tagflow Web"
LABEL org.opencontainers.image.description="Tagflow frontend application"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=base /app/dist /usr/share/nginx/html

# Add wget for healthcheck
RUN apk add --no-cache wget

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
