# ---------- Builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --frozen-lockfile

COPY . .
RUN npm run build

# ---------- Runner ----------
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app ./
EXPOSE 3000

CMD ["node", "dist/main.js"]
