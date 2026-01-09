FROM oven/bun:1.1.26 AS base
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install
COPY . .
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

FROM nginx:alpine
COPY --from=base /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
