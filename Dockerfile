# syntax=docker/dockerfile:1
# Production image: Node API + Vite static assets from dist/
FROM node:24-alpine AS builder
WORKDIR /app

ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_ANON_KEY=
ARG VITE_ADMIN_EMAILS=
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_ADMIN_EMAILS=$VITE_ADMIN_EMAILS

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server ./server
EXPOSE 3001
# tsx (a production dependency) resolves the `.js`-suffixed relative imports in
# server/src/*.ts; Node's native type stripping does not rewrite those specifiers.
CMD ["./node_modules/.bin/tsx", "server/src/index.ts"]
