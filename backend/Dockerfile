FROM node:20-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

# Copy only necessary files (avoid recursive copy)
COPY src ./src
COPY index.js ./

USER appuser

EXPOSE 4000

CMD ["node", "index.js"]
