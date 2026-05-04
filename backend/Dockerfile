FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY src ./src
COPY index.js ./
COPY package*.json ./

EXPOSE 4000

CMD ["npx", "nodemon", "index.js"]