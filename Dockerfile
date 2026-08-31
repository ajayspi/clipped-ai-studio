# ==============================================================================
# Base Stage: Node.js 22 on Alpine Linux with FFmpeg & native toolchains
# ==============================================================================
FROM node:22-alpine AS base

# Install system dependencies (libc6-compat for SWC/turbopack, ffmpeg for audio/video engine, procps, tzdata)
RUN apk add --no-cache \
    libc6-compat \
    ffmpeg \
    procps \
    tzdata

WORKDIR /app

# Enable pnpm via corepack matching packageManager in package.json (pnpm@11.24.0)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate

# ==============================================================================
# Dependencies Stage: Install node_modules (respects onlyBuiltDependencies)
# ==============================================================================
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --ignore-scripts

# ==============================================================================
# Builder Stage: Compile Next.js with Standalone Output
# ==============================================================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm run build

# ==============================================================================
# Runner Stage: Minimal production image with non-root security user
# ==============================================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root system user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
