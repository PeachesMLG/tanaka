FROM node:24.4.1 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm install -g typescript

RUN tsc

FROM node:24.4.1

WORKDIR /app

COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package*.json /app/

CMD ["node", "dist/index.js"]
