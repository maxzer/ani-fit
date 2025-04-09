FROM nginx:alpine

# Создаем директорию для SSL сертификатов
RUN mkdir -p /etc/nginx/ssl && \
    chown -R nginx:nginx /etc/nginx/ssl && \
    chmod -R 600 /etc/nginx/ssl

# Копируем конфигурацию
COPY conf.d /etc/nginx/conf.d/

# Копируем SSL сертификаты
COPY ssl /etc/nginx/ssl/

# Устанавливаем правильные права на сертификаты
RUN chmod 600 /etc/nginx/ssl/*

EXPOSE 80 443 