#!/usr/bin/env bash
# 与生产并行：项目名 private-chef-test；宿主机端口 8080/8443/5434/6380（生产占 80/443/5433/6381）
docker compose -p private-chef-test -f ./docker-compose.test.yml --env-file ../.env.test up -d --build
