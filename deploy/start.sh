#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 必须在 deploy/ 下执行：否则可能误用仓库根目录的 docker-compose（开发栈），且 --env-file 路径会错
# --env-file 须紧跟 docker compose，用于 ${DATABASE_*} 等变量替换（含 postgres 的 POSTGRES_*）
# 生产 .env.prod 中 DATABASE_URL 主机名须为 postgres（与 compose 服务名一致）
docker compose -f docker-compose.yml -p private-chef-prod --env-file ../.env.prod up -d --build
