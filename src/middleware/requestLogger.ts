import type { MiddlewareHandler } from 'hono'
import pino from 'pino'
import * as fs from 'node:fs'
import * as path from 'node:path'

const NODE_ENV = process.env.NODE_ENV ?? 'production'
const isDevelopment = NODE_ENV === 'development'

const logDir = path.resolve(process.cwd(), 'logs')
const logFilePath = path.join(logDir, 'pino-request.log')

// 初始化一次即可，避免每个请求重复创建 logger
const logger = (() => {
  if (isDevelopment) {
    return pino({
      level: 'info',
      redact: ['req.headers.authorization'],
    })
  }

  fs.mkdirSync(logDir, { recursive: true })
  const destination = fs.createWriteStream(logFilePath, { flags: 'a' })

  return pino(
    {
      level: 'info',
      redact: ['req.headers.authorization'],
    },
    destination,
  )
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

    logger.info(
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

