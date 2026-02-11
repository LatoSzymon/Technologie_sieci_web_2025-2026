FROM node:22-alpine as builder

WORKDIR /app

ARG VITE_API_HOST=localhost
ARG VITE_API_PORT=3443
ENV VITE_API_HOST=$VITE_API_HOST
ENV VITE_API_PORT=$VITE_API_PORT

COPY package*.json ./
RUN npm ci

COPY index.html ./
COPY vite.config.js ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm run build

FROM node:22-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173", "--ssl-cert", "/app/certificate/server.crt", "--ssl-key", "/app/certificate/server.key"]
