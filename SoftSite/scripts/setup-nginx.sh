#!/bin/bash

if [ -z "$1" ]; then
  echo "❌ Использование: ./setup-nginx.sh your-domain.com"
  exit 1
fi

DOMAIN=$1

echo "🌐 Настройка Nginx для домена: $DOMAIN"

# Создаем конфигурацию Nginx
cat > /etc/nginx/sites-available/agency << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL сертификаты (будут созданы Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_session_cache shared:SSL:10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    
    # Web Application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
    
    # Telegram Bot Webhook
    location /bot/webhook {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Только Telegram IP
        allow 149.154.160.0/20;
        allow 91.108.4.0/22;
        deny all;
    }
    
    # Health check
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# Создаем symlink
ln -sf /etc/nginx/sites-available/agency /etc/nginx/sites-enabled/

# Тестируем конфигурацию
nginx -t

if [ $? -eq 0 ]; then
  echo "✅ Конфигурация Nginx корректна"
  
  # Перезагружаем Nginx
  systemctl reload nginx
  
  echo ""
  echo "🔒 Получение SSL сертификата..."
  certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
  
  if [ $? -eq 0 ]; then
    echo "✅ SSL сертификат установлен"
    echo ""
    echo "🎉 Nginx настроен успешно!"
    echo "Ваш сайт доступен по адресу: https://$DOMAIN"
  else
    echo "⚠️  Ошибка получения SSL сертификата"
    echo "Проверьте что:"
    echo "  1. Домен правильно настроен (A-запись указывает на IP сервера)"
    echo "  2. Порты 80 и 443 открыты"
    echo "  3. DNS записи распространились (может занять до 24ч)"
  fi
else
  echo "❌ Ошибка в конфигурации Nginx"
  exit 1
fi

