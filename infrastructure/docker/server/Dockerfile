# Server Dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 5000

# Start development server
CMD ["pnpm", "--filter", "@campaign-manager/server", "dev"]

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Build shared packages
RUN pnpm --filter "@campaign-manager/shared-*" build

# Build server
RUN pnpm --filter "@campaign-manager/server" build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /app/packages/shared-utils/dist ./packages/shared-utils/dist

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001
USER nodeuser

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "apps/server/dist/index.js"]