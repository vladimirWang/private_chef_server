import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import prisma from "../plugins/prisma";
import { successResponse } from "../models/Response";
import { decode, sign, verify } from 'hono/jwt'
import { redisClient } from "../plugins/redis";
import { generateFixedSalt, sha256 } from "../utils/algo";

const JWT_SECRET = process.env.JWT_SECRET!

type LoginBody = {
  email: string;
  password: string;
  nonce: string;
};

type LoginContext = Context<
  Record<string, never>,
  string,
  { out: { json: LoginBody } }
>;

export const userLogin = async (c: LoginContext) => {
  const body = c.req.valid("json");
  const {password, nonce} = body;
  const userExisted = await prisma.user.findFirst({
    where: {
      email: body.email,
      // password: body.password,
    },
  });
  if (!userExisted) {
    throw new HTTPException(401, { message: "用户不存在" });
  }
  const calculatedPassword = sha256(userExisted.password + "_" + nonce);

  if (calculatedPassword !== password) {
    throw new HTTPException(401, { message: "邮箱或密码错误" });
  }

  const payload = {
    userId: userExisted.id,
  }
  // const secret = 'mySecretKey'
  const token = await sign(payload, JWT_SECRET)

  const resp = successResponse(
    {
      token
      // id: user.id,
      // email: user.email,
    },
    "登录成功"
  )
  return c.json(
    resp
  );
};

type RegisterBody = {
  email: string;
  password: string;
};

type RegisterContext = Context<
  Record<string, never>,
  string,
  { out: { json: RegisterBody } }   
>;

export const userRegister = async (c: RegisterContext) => {
  const body = c.req.valid("json")
  console.log("body.email: ", prisma.user)
  const salt = generateFixedSalt()
  const passwordHash = sha256(body.password + "_" + salt);
  const record = await prisma.user.create({
      data: {
          email: body.email,
          password: passwordHash,
          salt
      }
  })


  await redisClient.del(`emailVerification:${body.email}`)
  // return c.json({
  //   message: 'success',
  //   // data: record,
  // })
  return c.json(
    successResponse(
      {
        id: record.id,
        email: record.email,
        // id: 1,
        // email: 'body.email',
      },
      "注册成功"
    )
  );
}

export const getUserInfo = async (c: Context) => {
  const userId = c.get("jwtPayload")
  // const token = c.req.header("Authorization")?.split(" ")[1];
  // if (!token) {
  //   throw new HTTPException(401, { message: "未登录" });
  // }
  // const payload = await verify(token, JWT_SECRET);
  return c.json(successResponse({userId}, "获取用户信息成功"));
}

export const getUserSalt = async (c: Context) => {
  const email = c.req.param("email")
  const user = await prisma.user.findFirst({
    where: {
      email: email,
    },
  })
  return c.json(successResponse(user?.salt, "获取用户盐成功"));
}