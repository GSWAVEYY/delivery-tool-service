# ─── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files for dependency install
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy prisma schema before generating client
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src/

RUN npx tsc

# ─── Stage 2: Production ────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist/

# Copy prisma schema + migrations + generated client
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma/
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client/

EXPOSE 3001

CMD ["node", "dist/index.js"]
