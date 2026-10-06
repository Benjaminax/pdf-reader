# Etapa 1: Build del frontend
FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm@12
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Etapa 2: Servir con Node.js + Express
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm@12
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY server ./server
COPY --from=builder /app/dist ./dist

EXPOSE 2077

CMD ["node", "server/index.js"]
