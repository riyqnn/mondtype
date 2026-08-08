FROM node:24-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["npx", "tsx", "socket-server.ts"]