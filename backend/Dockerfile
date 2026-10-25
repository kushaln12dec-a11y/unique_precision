# Place this file at backend/Dockerfile (i.e. INSIDE the backend folder) if your
# Railway service's Root Directory is set to "backend". Self-contained: builds
# only the backend, since the frontend is deployed separately (Cloudflare Pages).

FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg ca-certificates \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y --no-install-recommends \
    google-chrome-stable \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV NODE_ENV=production

WORKDIR /app

# Build context here is the backend/ folder itself (Root Directory = backend),
# so paths are relative to backend/, not the monorepo root.
COPY package.json package-lock.json* ./
RUN npm install --include=dev
COPY . .
RUN npx prisma generate && npm run build

# Build-time sanity check: fail loudly here if any library is still missing,
# instead of discovering it at request time in production.
RUN google-chrome-stable --headless --disable-gpu --no-sandbox --dump-dom about:blank > /dev/null

EXPOSE 5000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss || true; node dist/index.js"]
