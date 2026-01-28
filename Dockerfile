FROM node:18-alpine as backend

WORKDIR /app

COPY package*.json ./
COPY index.js ./
COPY passport.js ./
COPY certificate/ ./certificate/
COPY controllers/ ./controllers/
COPY middleware/ ./middleware/
COPY models/ ./models/
COPY routes/ ./routes/

RUN npm install

EXPOSE 3000 3443

CMD ["node", "index.js"]
