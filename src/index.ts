import { Hono } from 'hono'
import prisma from './utils/prisma'


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

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default {
  port: 3000,
  fetch: app.fetch
}
