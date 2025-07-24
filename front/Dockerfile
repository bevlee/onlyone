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

# Copy only the built static files
COPY --from=builder /app/build ./build
