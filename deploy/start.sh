#!/usr/bin/env bash
# set -euo pipefail

# cd "$(dirname "$0")"
# --env-file 必须跟在 docker compose 后面，用于 compose 里 ${DATABASE_*} 等变量替换（含 postgres 的 POSTGRES_*）
# 生产 .env.prod 中 DATABASE_URL 主机名须为 postgres（与 compose 服务名一致）
docker compose -p private-chef-prod --env-file ../.env.prod up -d --build
