FROM node:latest

WORKDIR /app/supermarketsMicroservice

RUN npm install

COPY . .

COPY supermarkets.db ./supermarkets.db


CMD ["node", "supermarketsMicroservice.js"]
