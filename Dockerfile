# syntax=docker/dockerfile:1
# Production image: Node API + Vite static assets from dist/
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx@4.21.0 --no-save
COPY --from=builder /app/dist ./dist
COPY server ./server
EXPOSE 3001
CMD ["npx", "tsx", "server/src/index.ts"]
