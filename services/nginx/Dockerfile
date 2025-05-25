FROM nginx:alpine

# Increase system limits
RUN ulimit -n 65535

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY codebattle.conf /etc/nginx/conf.d/default.conf
