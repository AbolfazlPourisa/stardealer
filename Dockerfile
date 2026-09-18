FROM node:24-alpine AS development

WORKDIR /app

COPY . .
RUN npm install

CMD ["npm", "run", "watch"]


FROM node:24-alpine AS production

WORKDIR /app

COPY . .
RUN npm install

COPY src ./src

RUN npm run build

CMD ["npm", "run", "start"]
