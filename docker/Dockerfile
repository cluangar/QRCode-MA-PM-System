FROM node:20-alpine

LABEL description="MA/PM AR Inspector"

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache python3 make g++ openssl && \
    npm install --omit=dev --legacy-peer-deps && \
    npm cache clean --force && \
    apk del make g++

COPY dist ./dist
COPY server.js config.js ./

EXPOSE 3001

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health > /dev/null || exit 1

CMD ["node", "server.js"]
