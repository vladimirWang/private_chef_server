import { createHash, randomBytes } from "node:crypto";

// 工具函数：生成固定盐（用户注册时用）
export function generateFixedSalt() {
    // Bun 下全局 crypto 是 Web Crypto，须用 node:crypto 的 randomBytes
    return randomBytes(16).toString("hex");
  }

export function sha256(str: string) {
    return createHash("sha256").update(str).digest("hex");
}

// 工具函数：生成一次性nonce（登录前获取）
export function generateNonce() {
    const randomStr = randomBytes(16).toString("hex");
    const timestamp = Date.now().toString();
    return `${randomStr}_${timestamp}`;
}

/** 生成随机密码（排除易混淆字符 0/O/1/l/I） */
export function generateRandomPassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}