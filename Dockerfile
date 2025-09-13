# Stage 1: Build the application
FROM node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@9.15.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source code and config
COPY src/ ./src/
COPY tsconfig.json ./

# Build with esbuild
RUN pnpm run build

# Stage 2: Production image
FROM node:22-alpine AS production

WORKDIR /app

# Copy ONLY the built bundle - no node_modules needed
COPY --from=builder /app/dist/ ./dist/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R mcp:nodejs /app
USER mcp

# Expose the port
EXPOSE 3067

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request({hostname: 'localhost', port: 3067, path: '/health', timeout: 2000}, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }); req.on('error', () => process.exit(1)); req.end();"

# Run the bundled application directly
CMD ["node", "dist/index.js", "--transport", "http", "--port", "3067"]
