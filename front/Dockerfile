# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Test Stage ----
FROM node:20-alpine AS test

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm test:unit
# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

# Copy only the built output and necessary files
COPY --from=builder /app/.svelte-kit ./svelte-kit
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev
