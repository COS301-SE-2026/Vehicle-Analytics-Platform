FROM node:20-alpine

# create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src ./src
COPY index.js ./
COPY package*.json ./

USER appuser

EXPOSE 4000

CMD ["npx", "nodemon", "index.js"]