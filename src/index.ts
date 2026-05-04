import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { errorResponse, successResponse } from './models/Response'
import userRouter from './router/userRouter';
import chatRouter from './router/chatRouter';
import utilRouter from './router/utilRouter';
import { requestLogger } from './middleware/requestLogger'
import {jwt} from 'hono/jwt'
import type { JwtVariables } from 'hono/jwt'

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
type Variables = JwtVariables
const app = new Hono<{ Variables: Variables }>()

/** 不需要鉴权的完整路径（含挂载前缀，如 /user/login） */
const JWT_PUBLIC_PATHS = new Set<string>(['/', '/user/login', '/user/register'])

/** 不需要鉴权的路径前缀（例如 /util/health） */
const JWT_PUBLIC_PREFIXES: string[] = []

function isJwtPublic(path: string, method: string): boolean {
  if (method === 'OPTIONS') return true
  if (JWT_PUBLIC_PATHS.has(path)) return true
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
