# Frontend Dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development

# Copy source code
COPY . .

# Expose port
EXPOSE 3002

# Start development server
CMD ["pnpm", "--filter", "@campaign-manager/frontend", "dev", "--host", "0.0.0.0", "--port", "3002"]

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Build shared packages
RUN pnpm --filter "@campaign-manager/shared-*" build

# Build frontend
RUN pnpm --filter "@campaign-manager/frontend" build

# Production stage
FROM nginx:alpine AS production

# Copy built files
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY infrastructure/nginx/frontend.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]