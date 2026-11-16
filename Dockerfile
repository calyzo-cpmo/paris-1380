# Paris à travers le temps : sert la page d'accueil et les quatre maquettes autonomes de dist/ (déjà construites et versionnées) avec nginx.
FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/index.html /usr/share/nginx/html/index.html
COPY dist/1380.html /usr/share/nginx/html/1380.html
COPY dist/1789.html /usr/share/nginx/html/1789.html
COPY dist/lutece.html /usr/share/nginx/html/lutece.html
COPY dist/1889.html /usr/share/nginx/html/1889.html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1
