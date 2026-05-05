#!/bin/bash
# auth.sh - 公共登录工具（独立文件）

base=http://localhost:3000

# 公共登录方法
login() {
  echo "正在登录..."
  
  TOKEN=$(curl -s -X POST "$base/user/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"413114463@qq.com","password":"12345678"}' \
    | jq -r '.data.token'
  )

  echo "✅ 登录成功，token：$TOKEN"
  echo "----------------------------------------"

  # 把 TOKEN 变成全局变量，其他脚本能用
  export TOKEN
}
