# ================================
# BUILD STAGE
# ================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including dev dependencies for building/testing)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# ================================
# TEST STAGE
# ================================
FROM builder AS tester

# Run linting and tests
RUN npm test

# ================================
# PRODUCTION DEPENDENCIES STAGE
# ================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# ================================
# PRODUCTION STAGE
# ================================
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S gameserver -u 1001

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code from builder (excludes dev dependencies)
COPY --from=builder /app/config ./config
COPY --from=builder /app/handlers ./handlers
COPY --from=builder /app/modules ./modules
COPY --from=builder /app/utils ./utils
COPY --from=builder /app/index.js ./
COPY --from=builder /app/config.js ./
COPY --from=builder /app/wordOperations.js ./
COPY --from=builder /app/package*.json ./

# Change ownership to non-root user
RUN chown -R gameserver:nodejs /app

# Switch to non-root user
USER gameserver

EXPOSE 3000

# Start the application
CMD ["npm", "start"]