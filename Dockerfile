FROM node:22-alpine as frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/index.html ./
COPY frontend/vite.config.js ./
COPY frontend/src/ ./src/
COPY frontend/public/ ./public/

RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY index.js ./
COPY passport.js ./
COPY certificate/ ./certificate/
COPY controllers/ ./controllers/
COPY middleware/ ./middleware/
COPY models/ ./models/
COPY routes/ ./routes/
COPY scripts/ ./scripts/
COPY services/ ./services/
COPY validation/ ./validation/
COPY --from=frontend-builder /frontend/dist ./frontend/dist

EXPOSE 3000 3443

CMD ["node", "index.js"]
