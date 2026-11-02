#!/bin/sh
# Creates a self-signed certificate on the first start, then runs nginx.
set -eu

if [ ! -f /etc/nginx/ssl/cert.pem ]; then
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
        -keyout /etc/nginx/ssl/key.pem -out /etc/nginx/ssl/cert.pem \
        -subj "/CN=localhost" 2> /dev/null
fi

exec "$@"
