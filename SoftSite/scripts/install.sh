#!/bin/bash
set -e

echo "🚀 Agency Management System - Автоматическая установка"
echo "======================================================="
echo ""

# Проверка что запущено от root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Пожалуйста, запустите скрипт от root: sudo ./install.sh"
  exit 1
fi

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}📦 Шаг 1/8: Обновление системы${NC}"
apt update && apt upgrade -y

echo ""
echo -e "${GREEN}📦 Шаг 2/8: Установка базовых пакетов${NC}"
apt install -y curl wget git vim htop ufw fail2ban build-essential software-properties-common

echo ""
echo -e "${YELLOW}⚠️  Node.js должен быть установлен вручную (версия 18+)${NC}"
echo "Проверка Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js установлен: $NODE_VERSION"
else
    echo "❌ Node.js не найден! Установите вручную:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -"
    echo "   apt install -y nodejs"
    exit 1
fi

echo ""
echo -e "${GREEN}📦 Шаг 3/7: Установка PM2${NC}"
npm install -g pm2
pm2 startup systemd -u root --hp /root
echo "✅ PM2 установлен"

echo ""
echo -e "${GREEN}📦 Шаг 4/7: Установка PostgreSQL 14${NC}"
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
echo "✅ PostgreSQL установлен"

echo ""
echo -e "${GREEN}📦 Шаг 5/7: Установка Redis${NC}"
apt install -y redis-server
systemctl start redis-server
systemctl enable redis-server
echo "✅ Redis установлен"

echo ""
echo -e "${GREEN}📦 Шаг 6/7: Установка Nginx${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx
echo "✅ Nginx установлен"

echo ""
echo -e "${GREEN}📦 Шаг 7/7: Установка Certbot${NC}"
apt install -y certbot python3-certbot-nginx
echo "✅ Certbot установлен"

echo ""
echo -e "${GREEN}🔥 Настройка Firewall${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
echo "✅ Firewall настроен"

echo ""
echo -e "${GREEN}🔒 Настройка Fail2ban${NC}"
systemctl start fail2ban
systemctl enable fail2ban
echo "✅ Fail2ban настроен"

echo ""
echo "======================================================="
echo -e "${GREEN}✅ Установка базового ПО завершена!${NC}"
echo "======================================================="
echo ""
echo -e "${YELLOW}📝 Следующие шаги:${NC}"
echo ""
echo "1. Настройте PostgreSQL:"
echo "   sudo -u postgres psql"
echo "   CREATE DATABASE agency_db;"
echo "   CREATE USER agency_user WITH PASSWORD 'your_password';"
echo "   GRANT ALL PRIVILEGES ON DATABASE agency_db TO agency_user;"
echo "   ALTER USER agency_user CREATEDB;"
echo "   \\q"
echo ""
echo "2. Клонируйте репозиторий:"
echo "   cd /home"
echo "   git clone your-repo-url agency"
echo "   cd agency"
echo ""
echo "3. Настройте .env файлы:"
echo "   cd SoftSite && cp .env.example .env"
echo "   nano .env  # Заполните все переменные"
echo ""
echo "4. Установите зависимости:"
echo "   npm install"
echo "   npx prisma generate"
echo "   npx prisma db push"
echo "   npm run db:seed"
echo ""
echo "5. Соберите приложение:"
echo "   npm run build"
echo ""
echo "6. Настройте домен:"
echo "   ./scripts/setup-nginx.sh your-domain.com"
echo ""
echo "7. Запустите приложения:"
echo "   ./scripts/start-production.sh"
echo ""
echo -e "${GREEN}🎉 Готово! Следуйте инструкциям выше.${NC}"

