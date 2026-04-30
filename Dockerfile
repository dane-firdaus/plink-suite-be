FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production

EXPOSE 4099

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "run", "start:prod"]
