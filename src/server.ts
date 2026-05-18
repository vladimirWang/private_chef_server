import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { errorResponse, successResponse } from './models/Response'
import userRouter from './router/userRouter';
import chatRouter from './router/chatRouter';
import knowledgeBaseRouter from './router/knowledgeBaseRouter';
import utilRouter from './router/utilRouter';
import { requestLogger } from './middleware/requestLogger'
import {jwt} from 'hono/jwt'
import type { JwtVariables } from 'hono/jwt'
import {getRunMode, RunMode} from './runMode'
import { connectRedis } from './plugins/redis';

await connectRedis()

let mode = getRunMode()
mode = mode ?? "online"
const JWT_SECRET =process.env.JWT_SECRET!

// prisma.User.create({
//   data: {
//     email: '123',
//     password: '123'
//   }
// }).then(res => {
//   console.log("success: ", res)
// }).catch(e => {
//     console.log("fail: ", e)
// })
type JwtPayload = { userId: number }
type AppVariables = JwtVariables<JwtPayload> & { mode: RunMode }

const app = new Hono<{ Variables: AppVariables }>()

/** 不需要鉴权的固定路径（无动态段，与 c.req.path 完全一致） */
const JWT_PUBLIC_EXACT = new Set<string>([
  '/user/login',
  '/user/register',
  '/util/verifyEmail',
  '/util/get-nonce',
])

/**
 * 不需要鉴权的路径模板（Hono 写法，:name 匹配单段路径）
 * 例：'/util/sendEmailVerificationCode/:email' 可匹配
 *     /util/sendEmailVerificationCode/foo%40bar.com
 */
const JWT_PUBLIC_PATTERNS = [
  '/util/sendEmailVerificationCode/:email',
  '/user/getSalt/:email',
] as const

/** 不需要鉴权的路径前缀（静态资源等） */
const JWT_PUBLIC_PREFIXES: string[] = ['/static']

function pathPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split('/')
    .map((segment) =>
      segment.startsWith(':') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    )
    .join('/')
  return new RegExp(`^${escaped}$`)
}

const JWT_PUBLIC_PATTERN_REGS = JWT_PUBLIC_PATTERNS.map(pathPatternToRegExp)

function isJwtPublic(path: string, method: string): boolean {
  if (method === 'OPTIONS') return true
  if (JWT_PUBLIC_EXACT.has(path)) return true
  if (JWT_PUBLIC_PATTERN_REGS.some((re) => re.test(path))) return true
  for (const prefix of JWT_PUBLIC_PREFIXES) {
    const p = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
    if (path === p || path.startsWith(`${p}/`)) return true
  }
  return false
}

const jwtAuth = jwt({
  secret: JWT_SECRET,
  alg: 'HS256',
})

// 记录请求：url / 请求参数 / ip / 响应处理耗时
app.use('*', requestLogger)

app.use('*', async (c, next) => {
  let mode = getRunMode()
  mode = mode ?? "online"
  c.set('mode', mode)
  await next()
})

/** 本地上传的文件：/static/uploaded/... → 进程工作目录下 static/... */
app.use(
  '/static/*',
  serveStatic({
    root: process.cwd(),
    rewriteRequestPath: (p) => p.replace(/^\//, ''),
  })
)

app.use('*', async (c, next) => {
  if (isJwtPublic(c.req.path, c.req.method)) return next()
  return jwtAuth(c, next)
})

app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json(errorResponse(400, "请求参数错误", err.issues), 400)
  }

  if (err instanceof HTTPException) {
    return c.json(errorResponse(err.status, err.message), err.status)
  }

  console.error("Unhandled error:", err)
  return c.json(errorResponse(500, "服务器内部错误"), 500)
})

app.notFound((c) => {
  return c.json(errorResponse(404, "接口不存在"), 404)
})

app.route('/user', userRouter)
.route('/chat', chatRouter)
.route('/util', utilRouter)
.route('/knowledgeBase', knowledgeBaseRouter)

app.get('/', (c) => {
  return c.json(
    successResponse({
      message: 'Hello Hono!',
    })
  )
})

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch
}
