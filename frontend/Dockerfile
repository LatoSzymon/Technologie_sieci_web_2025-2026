FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
COPY vite.config.js ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm install && npm run build

FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
