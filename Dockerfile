FROM node:24 AS base

WORKDIR /app

COPY package*.json ./

RUN npm ci --force

COPY . .

RUN npm run build
RUN npm prune --omit=dev

FROM gcr.io/distroless/nodejs24-debian12:nonroot

COPY --from=base /app/package*.json ./
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules

ENV NODE_PATH=/app/dist

CMD ["dist/app.js"]
