FROM nginx:1.27-alpine

COPY . /usr/share/nginx/html
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

# Remove dev-only files from image
RUN rm -rf /usr/share/nginx/html/node_modules \
           /usr/share/nginx/html/dev-server.js \
           /usr/share/nginx/html/nginx.prod.conf \
           /usr/share/nginx/html/package*.json

EXPOSE 80
