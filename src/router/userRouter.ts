import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import prisma from "../utils/prisma";
import {z} from 'zod'
import {zValidator} from '@hono/zod-validator'
import { successResponse } from "../models/Response";
import { userLogin, userRegister } from "../controllers/userController";
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
}), userLogin).post("/register", zValidator("json", registerSchema, (result) => {
  if (!result.success) {
    throw result.error;
  }
}), userRegister)

export default userRouter;