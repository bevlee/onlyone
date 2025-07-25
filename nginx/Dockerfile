FROM nginx:alpine

# Copy config
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY start-nginx.sh /start-nginx.sh

# Copy frontend static files from the build image
COPY --from=onlyone-frontend:latest /app/build /usr/share/nginx/html

RUN chmod +x /start-nginx.sh

EXPOSE 80 443

CMD ["/start-nginx.sh"]