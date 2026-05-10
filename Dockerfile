FROM node:20-alpine AS base
WORKDIR /app

# Install curl
RUN apk add --no-cache curl

# Install pnpm globally
RUN npm install -g pnpm

# Copy important files and folders first
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Setup database
COPY prisma ./
RUN npx prisma generate

# Now copy everything
COPY . .
RUN pnpm run build

EXPOSE 3000
CMD ["pnpm", "run", "start"]
