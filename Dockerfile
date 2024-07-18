FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

COPY .env .env

ARG PORT
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["node", "server.js"]