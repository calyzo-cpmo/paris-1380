# Paris 1380 et Paris 1789 : sert les deux pages autonomes de dist/ (déjà construites et versionnées) avec nginx.
FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/index.html /usr/share/nginx/html/index.html
COPY dist/1789.html /usr/share/nginx/html/1789.html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1
