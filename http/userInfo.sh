#!/bin/bash
base=http://localhost:3000

source login.sh

login

userInfo=$(curl -s -X GET "$base/user/info" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ 用户信息: $userInfo"
