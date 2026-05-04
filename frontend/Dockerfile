FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY package*.json ./
COPY index.html ./
COPY vite.config.* ./
COPY src ./src

EXPOSE 5173

CMD ["npm", "run", "dev"]