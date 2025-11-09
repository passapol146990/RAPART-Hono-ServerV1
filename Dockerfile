# Use Bun official image
FROM oven/bun:1.1-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Development dependencies for building (if needed)
FROM base AS builder
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

# Copy dependencies and source code
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=hono:nodejs . .

# Create storage directories
RUN mkdir -p /app/storage/apk/malware /app/storage/apk/benign \
             /app/storage/reports/malware /app/storage/reports/benign && \
    chown -R hono:nodejs /app/storage

# Switch to non-root user
USER hono

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run healthcheck.ts || exit 1

# Start the server
CMD ["bun", "run", "server.ts"]
