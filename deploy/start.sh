#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE="../.env.prod"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "缺少 $ENV_FILE，请先配置生产环境变量" >&2
  exit 1
fi

if ! docker network inspect private_chef_network >/dev/null 2>&1; then
  echo "未找到 Docker 网络 private_chef_network，请先启动基础设施：" >&2
  echo "  cd ../../docker_infrastracture && docker compose up -d" >&2
  exit 1
fi

POSTGRES_CONTAINER="shared-postgres"
if ! docker inspect "$POSTGRES_CONTAINER" >/dev/null 2>&1; then
  echo "未找到 Postgres 容器 $POSTGRES_CONTAINER，请先启动基础设施：" >&2
  echo "  cd ../../docker_infrastracture && docker compose up -d" >&2
  exit 1
fi

echo "等待 $POSTGRES_CONTAINER 就绪..."
health="none"
for _ in $(seq 1 60); do
  health="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$POSTGRES_CONTAINER" 2>/dev/null || echo missing)"
  if [[ "$health" == "healthy" ]]; then
    break
  fi
  if [[ "$health" == "missing" ]] || [[ "$(docker inspect --format='{{.State.Status}}' "$POSTGRES_CONTAINER" 2>/dev/null)" != "running" ]]; then
    echo "Postgres 容器未运行，请先启动基础设施：" >&2
    echo "  cd ../../docker_infrastracture && docker compose up -d" >&2
    exit 1
  fi
  sleep 2
done

if [[ "$health" != "healthy" ]]; then
  echo "Postgres 健康检查超时，请检查 $POSTGRES_CONTAINER 日志" >&2
  exit 1
fi

# 必须在 deploy/ 下执行：否则可能误用仓库根目录的 docker-compose（开发栈），且 --env-file 路径会错
# .env.prod 中 DATABASE_URL 主机名须为 postgres（docker_infrastracture 服务名）
docker compose -f docker-compose.yml -p private-chef-prod --env-file "$ENV_FILE" up -d --build
