#!/bin/bash
base=http://localhost:3000

source login.sh

login

FILE="${1:?用法: $0 <本地文件路径>}"
if [[ ! -f "$FILE" ]]; then
  echo "❌ 文件不存在: $FILE" >&2
  exit 1
fi

result=$(curl -s -X POST "$base/util/uploadFile" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@${FILE}")

echo "✅ 上传响应: $result"
