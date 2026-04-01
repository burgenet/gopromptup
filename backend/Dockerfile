FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

ENV PORT=3010
EXPOSE 3010

CMD ["node", "src/server.js"]
