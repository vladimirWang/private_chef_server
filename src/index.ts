import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { errorResponse, successResponse } from './models/Response'
import userRouter from './router/userRouter';


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
const app = new Hono()

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

app.get('/', (c) => {
  return c.json(
    successResponse({
      message: 'Hello Hono!',
    })
  )
})

export default {
  port: 3000,
  fetch: app.fetch
}
