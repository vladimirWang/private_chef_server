import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import prisma from "../utils/prisma";
import {z} from 'zod'
import {zValidator} from '@hono/zod-validator'
import { successResponse } from "../models/Response";
const userRouter = new Hono();

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
}).refine(async (data) => {
  const existed = await prisma.user.findFirst({
    where: {
      email: data.email
    }
  })
  return !Boolean(existed)
}, {
  message: '邮箱已存在',
  path: ['email']
});

userRouter.get("/", (c) => {
  return c.json(
    successResponse({
      message: "Hello World user",
    })
  );
}).post("/login", zValidator("json", loginSchema, (result) => {
  if (!result.success) {
    throw result.error;
  }
}), async (c) => {
  const body = c.req.valid("json")
  const user = await prisma.user.findFirst({
    where: {
      email: body.email,
      password: body.password
    }
  })

  if (!user) {
    throw new HTTPException(401, { message: "邮箱或密码错误" });
  }

  return c.json(
    successResponse(
      {
        id: user.id,
        email: user.email,
      },
      "登录成功"
    )
  );
}).post("/register", zValidator("json", registerSchema, (result) => {
  if (!result.success) {
    throw result.error;
  }
}), async (c) => {
    const body = c.req.valid("json")
    const record = await prisma.user.create({
        data: {
            email: body.email,
            password: body.password,
        }
    })
  // return c.json({
  //   message: 'success',
  //   // data: record,
  // })
  return c.json(
    successResponse(
      {
        id: record.id,
        email: record.email,
      },
      "注册成功"
    )
  );
})

export default userRouter;