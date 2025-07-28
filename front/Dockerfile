# ---- Build Stage ----
FROM node:20 AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN find src -name "*.svelte" -o -name "*.js" -o -name "*.ts" | head -50
RUN npm run build

# ---- Test Stage ----
FROM node:20 AS test

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm test:unit
# ---- Artifacts Stage ----
FROM node:20 AS artifacts

WORKDIR /app

# Copy only the built static files to /app/build for nginx consumption
COPY --from=builder /app/build ./build

# This stage serves as a build artifact container
# The build directory contains all static files needed by nginx
