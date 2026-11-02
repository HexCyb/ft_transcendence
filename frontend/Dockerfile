# 1. compile the TypeScript app
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json index.html styles.css ./
COPY src ./src
RUN npm run build

# 2. serve it over HTTPS
FROM nginx:1.27-alpine
RUN apk add --no-cache openssl
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html
RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 443
ENTRYPOINT ["entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
