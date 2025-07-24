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
# ---- Artifacts Stage ----
FROM node:20-alpine AS artifacts

WORKDIR /app

# Copy only the built static files to /app/build for nginx consumption
COPY --from=builder /app/build ./build

# This stage serves as a build artifact container
# The build directory contains all static files needed by nginx
