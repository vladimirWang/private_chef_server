import type { MiddlewareHandler } from 'hono'
import pino from 'pino'
import * as fs from 'node:fs'
import * as path from 'node:path'

const NODE_ENV = process.env.NODE_ENV ?? 'production'
const isDevelopment = NODE_ENV === 'development'

const logDir = path.resolve(process.cwd(), 'logs')
const accessLogPath = path.join(logDir, 'access.log')
const errorLogPath = path.join(logDir, 'error.log')

// 初始化一次即可，避免每个请求重复创建 logger
const commonLoggerOptions = {
  level: 'info',
  // 避免把敏感信息写进日志
  redact: ['req.headers.authorization'],
}

const accessLogger = (() => {
  if (isDevelopment) {
    // 开发环境：直接输出到控制台（stdout），不写入日志文件
    return pino(commonLoggerOptions)
  }

  fs.mkdirSync(logDir, { recursive: true })
  return pino(commonLoggerOptions, fs.createWriteStream(accessLogPath, { flags: 'a' }))
})()

const errorLogger = (() => {
  if (isDevelopment) {
    // 开发环境：同样只写控制台（也便于本地排查）
    return accessLogger
  }

  return pino(commonLoggerOptions, fs.createWriteStream(errorLogPath, { flags: 'a' }))
})()

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now()

  try {
    await next()
  } finally {
    const durationMs = Date.now() - start

    // 从常见代理头取 IP：优先 x-forwarded-for，其次 x-real-ip，再其次 cf-connecting-ip
    const ipHeader =
      c.req.header('x-forwarded-for') ??
      c.req.header('x-real-ip') ??
      c.req.header('cf-connecting-ip')
    const ip = ipHeader ? ipHeader.split(',')[0].trim() : undefined

    const method = c.req.method
    const url = c.req.url // 含 query string
    const status = c.res.status || 500

    // 仅记录 query 和 path params，避免读取 body 导致业务侧拿不到请求体
    const query = c.req.query()
    const params = c.req.param()

    const targetLogger = status >= 400 ? errorLogger : accessLogger
    targetLogger.info(
      {
        method,
        url,
        params,
        query,
        ip,
        status,
        durationMs,
      },
      'request',
    )
  }
}

