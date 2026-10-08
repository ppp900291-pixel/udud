FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    fontconfig \
    fonts-dejavu \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "main.js"]