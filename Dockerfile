FROM bitnami/express:latest

WORKDIR /app
COPY . .

RUN npm install
RUN npm run build
CMD ["npm", "run", "serve"]
EXPOSE 8787
