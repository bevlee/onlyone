FROM nginx:alpine

# Build argument to specify frontend image source
ARG FRONTEND_IMAGE=bevdev1/onlyone-frontend:latest

# Copy config
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY start-nginx.sh /start-nginx.sh

# Copy frontend static files from the build image
COPY --from=${FRONTEND_IMAGE} /app/build /usr/share/nginx/html

RUN chmod +x /start-nginx.sh

EXPOSE 80 443

CMD ["/start-nginx.sh"]