# Use node:22-slim (Debian-based) to match local system (Alibaba Cloud Linux uses glibc like Debian)
# This avoids SWC binary compatibility issues between Alpine (musl) and glibc systems
# Using Node.js 22 to match local development environment
FROM --platform=${TARGETPLATFORM:-linux/amd64} node:22-slim AS alpine

# Install necessary system dependencies for Debian-based image
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    tzdata \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

FROM --platform=${TARGETPLATFORM:-linux/amd64} alpine AS base
RUN npm install turbo@^2.5.6 --global
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@9.5.0 --activate

FROM --platform=${TARGETPLATFORM:-linux/amd64} base AS pruner

WORKDIR /app

COPY . .
RUN turbo prune --scope=web --docker

FROM --platform=${TARGETPLATFORM:-linux/amd64} base AS builder

WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=pruner /app/out/json/ .

# Skip Puppeteer download to avoid network issues
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copy source files needed for Prisma generation
COPY --from=pruner /app/out/full/packages/shared ./packages/shared

# Install dependencies directly in Docker
RUN pnpm install --frozen-lockfile

# Install dotenv-cli globally for ClickHouse migrations
RUN npm install -g --no-package-lock --no-save dotenv-cli

# Generate Prisma client to ensure it's available during build
RUN cd packages/shared && npx prisma generate --schema=./prisma/schema.prisma

# Verify Prisma client was generated
RUN ls -la packages/shared/node_modules/.prisma/ || echo "Prisma client not found in expected location"
RUN find packages/shared -name ".prisma" -type d || echo "No .prisma directories found"

# SWC will be handled automatically by Next.js
# No need to manually install SWC packages

ENV DOCKER_BUILD 1
ENV NEXT_MANUAL_SIG_HANDLE true
# Debian-based system uses glibc, SWC will automatically use the correct binary

# pass public variables in build step
ARG NEXT_PUBLIC_PLAIN_APP_ID
ARG NEXT_PUBLIC_LANGFUSE_CLOUD_REGION
ENV NEXT_PUBLIC_LANGFUSE_CLOUD_REGION=$NEXT_PUBLIC_LANGFUSE_CLOUD_REGION
ARG NEXT_PUBLIC_DEMO_ORG_ID
ENV NEXT_PUBLIC_DEMO_ORG_ID=$NEXT_PUBLIC_DEMO_ORG_ID
ARG NEXT_PUBLIC_DEMO_PROJECT_ID
ENV NEXT_PUBLIC_DEMO_PROJECT_ID=$NEXT_PUBLIC_DEMO_PROJECT_ID
ARG NEXT_PUBLIC_SIGN_UP_DISABLED
ENV NEXT_PUBLIC_SIGN_UP_DISABLED=$NEXT_PUBLIC_SIGN_UP_DISABLED
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_LANGFUSE_TRACING_SAMPLE_RATE
ENV NEXT_PUBLIC_LANGFUSE_TRACING_SAMPLE_RATE=$NEXT_PUBLIC_LANGFUSE_TRACING_SAMPLE_RATE
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ENV NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_BASE_PATH
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH

# Sentry already needs to be set on build time to upload sourcemaps
# This must not be set for OSS releases as we would share our Sentry secret.
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ENV SENTRY_ORG=$SENTRY_ORG
ARG SENTRY_PROJECT
ENV SENTRY_PROJECT=$SENTRY_PROJECT

# Accept build id as NEXT_PUBLIC_BUILD_ID
ARG NEXT_PUBLIC_BUILD_ID
ENV NEXT_PUBLIC_BUILD_ID=$NEXT_PUBLIC_BUILD_ID
ENV SENTRY_RELEASE=$NEXT_PUBLIC_BUILD_ID

# Copy source code of isolated subworkspace
COPY --from=pruner /app/out/full/ .

# remove middleware.ts if it exists - not needed in self-hosted environments
RUN rm -f ./web/src/middleware.ts

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_MANUAL_SIG_HANDLE true
# set the CI flag to true to get CI specific logs
ENV CI true

RUN NODE_OPTIONS='--max-old-space-size=8192' turbo run build --filter=web...

# Production image, copy all the files and run next
FROM --platform=${TARGETPLATFORM:-linux/amd64} base AS runner

ARG TARGETPLATFORM
ARG BUILDPLATFORM

WORKDIR /app

ARG NEXT_PUBLIC_BUILD_ID
ENV BUILD_ID=$NEXT_PUBLIC_BUILD_ID
ARG NEXT_PUBLIC_LANGFUSE_CLOUD_REGION
ENV NEXT_PUBLIC_LANGFUSE_CLOUD_REGION=$NEXT_PUBLIC_LANGFUSE_CLOUD_REGION

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1
# Needed to re-enable validation of environment variables during runtime
ENV DOCKER_BUILD 0
# Set NEXT_MANUAL_SIG_HANDLE for runtime
ENV NEXT_MANUAL_SIG_HANDLE true

# Install necessary packages for Debian-based system
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    tzdata \
    openssl \
    ca-certificates \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Ensure Node.js is in PATH
ENV PATH="/usr/local/bin:$PATH"

# Don't run production as root
ARG UID=1001
ARG GID=1001
RUN addgroup --system --gid ${GID} nodejs
RUN adduser --system --uid ${UID} nextjs

RUN npm install -g --no-package-lock --no-save dotenv-cli

# Install dd-trace only if NEXT_PUBLIC_LANGFUSE_CLOUD_REGION is configured
ARG NEXT_PUBLIC_LANGFUSE_CLOUD_REGION
RUN if [ -n "$NEXT_PUBLIC_LANGFUSE_CLOUD_REGION" ]; then \
        npm install --no-package-lock --no-save dd-trace@5.36.0; \
    fi

# Set npm cache directory to a writable location for runtime
ENV NPM_CONFIG_CACHE=/tmp/.npm
ENV NPM_CONFIG_PREFIX=/tmp/.npm-global

# Download migrate tool with retry mechanism and fallback
RUN MIGRATE_TARGET_ARCH=$(echo ${TARGETPLATFORM:-linux/amd64} | sed 's/\//-/g') && \
    for i in 1 2 3; do \
        if wget -q -O- https://github.com/golang-migrate/migrate/releases/download/v4.18.3/migrate.$MIGRATE_TARGET_ARCH.tar.gz | tar xvz; then \
            mv migrate /usr/bin/migrate && break; \
        else \
            echo "Attempt $i failed, retrying..."; \
            sleep 5; \
        fi; \
    done && \
    if [ ! -f /usr/bin/migrate ]; then \
        echo "Warning: Failed to download migrate tool, some features may not work"; \
        touch /usr/bin/migrate; \
        chmod +x /usr/bin/migrate; \
    fi

COPY --from=builder --chown=nextjs:nodejs /app/web/next.config.mjs .
COPY --from=builder --chown=nextjs:nodejs /app/web/package.json .

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./web/public

# Copy the entire packages/shared directory to ensure all dependencies including Prisma client are available
COPY --from=builder --chown=nextjs:nodejs /app/packages/shared ./packages/shared

# Also copy the node_modules from builder to ensure all dependencies are available
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY --chown=nextjs:nodejs ./web/entrypoint.sh ./web/entrypoint.sh
COPY --chown=nextjs:nodejs ./packages/shared/scripts/cleanup.sql ./packages/shared/scripts/cleanup.sql
RUN chmod +x ./web/entrypoint.sh

# Install dd-trace directly using curl to avoid npm issues
RUN if [ ! -d "node_modules/dd-trace" ] || [ -L "node_modules/dd-trace" ]; then \
        echo "Installing dd-trace directly with curl..."; \
        rm -f node_modules/dd-trace; \
        apt-get update && apt-get install -y curl; \
        mkdir -p node_modules/dd-trace; \
        cd node_modules/dd-trace; \
        curl -sL https://registry.npmmirror.com/dd-trace/-/dd-trace-5.36.0.tgz | tar -xz --strip-components=1; \
        # Install dd-trace dependencies \
        npm install --no-package-lock --no-save --legacy-peer-deps import-in-the-middle@1.13.0 acorn@8.12.1; \
    fi

USER nextjs

# Default port to 3000
ENV PORT 3000

# Docker ENTRYPOINT (dumb-init) is covered by semantic versioning, not the entrypoint.sh itself
# Reasoning: ENTRYPOINT is overridden by some self-hosted deployments, thus changing this is breaking
ENTRYPOINT ["dumb-init", "--", "./web/entrypoint.sh"]

# startup command - use dd-trace if NEXT_PUBLIC_LANGFUSE_CLOUD_REGION is configured
CMD if [ -n "$NEXT_PUBLIC_LANGFUSE_CLOUD_REGION" ]; then \
      node --import dd-trace/initialize.mjs ./web/server.js --keepAliveTimeout 110000; \
    else \
      node ./web/server.js --keepAliveTimeout 110000; \
    fi

# Health check using wget
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/public/health || exit 1
