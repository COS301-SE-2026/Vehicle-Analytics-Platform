FROM node:20-alpine

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./
RUN npm install


COPY index.html ./
COPY vite.config.js ./
COPY src ./src

USER appuser

EXPOSE 5173

CMD ["npm", "run", "dev"]