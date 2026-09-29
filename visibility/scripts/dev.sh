#!/bin/sh
# Local server with SQLite: http://localhost:3000  (sign in: admin@example.com / change-me-please)
cd "$(dirname "$0")/../public" || exit 1
mkdir -p ../.data
export DB_DSN="${DB_DSN:-sqlite:$(cd .. && pwd)/.data/visibility.db}"
export SESSION_SECRET="${SESSION_SECRET:-dev-only-secret-dev-only-secret}"
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}" ADMIN_PASSWORD="${ADMIN_PASSWORD:-change-me-please}"
export SITE_URL="${SITE_URL:-https://white-cassowary-123006.hostingersite.com}"
exec php -S "localhost:${PORT:-3000}"
