import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import prisma from "../plugins/prisma";
import {z} from 'zod'
import {zValidator} from '@hono/zod-validator'
import { successResponse } from "../models/Response";
import { userLogin, userRegister, getUserInfo, getUserSalt, updateUserProfile, changeUserPassword, forgotUserPassword } from "../controllers/userController";
const userRouter = new Hono();

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  nonce: z.string()
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
})
.post("/login", zValidator("json", loginSchema, (result, c) => {
  if (!result.success) {
    // throw result.error;
    return c.text('Invalid!', 400)
  }
}), userLogin)
.post("/register", zValidator("json", registerSchema, (result, c) => {
  if (!result.success) {
    return c.text('Invalid!', 400)
  }
}), userRegister)
.post("/forgot-password", forgotUserPassword)
.get("/info", getUserInfo)
.put("/profile", updateUserProfile)
.put("/password", changeUserPassword)
.get("/getSalt/:email", getUserSalt)

export default userRouter;