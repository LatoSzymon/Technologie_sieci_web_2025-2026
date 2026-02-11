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

EXPOSE 3000 3443

CMD ["node", "index.js"]
