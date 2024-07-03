FROM node:16

WORKDIR /apiGateaway

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD ["node", "apiGateaway.js"]
