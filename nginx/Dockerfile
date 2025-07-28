# Combined nginx+frontend build
# Note that this will run from the root of the project, not from the nginx directory
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY front/package.json front/package-lock.json ./
RUN npm ci

# Copy frontend source
COPY front/ .
RUN npx svelte-kit sync && npm run build

# Nginx stage
FROM nginx:alpine AS final

# Copy built frontend
COPY --from=frontend-builder /app/build /usr/share/nginx/html

# Copy nginx config
COPY nginx/nginx.conf /etc/nginx/nginx.conf.template
COPY nginx/start-nginx.sh /start-nginx.sh

RUN chmod +x /start-nginx.sh

EXPOSE 80 443

CMD ["/start-nginx.sh"]