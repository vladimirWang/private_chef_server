import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import prisma from "../plugins/prisma";
import { successResponse } from "../models/Response";

type LoginBody = {
  email: string;
  password: string;
};

type LoginContext = Context<
  Record<string, never>,
  string,
  { out: { json: LoginBody } }
>;

export const userLogin = async (c: LoginContext) => {
  const body = c.req.valid("json");
  const user = await prisma.user.findFirst({
    where: {
      email: body.email,
      password: body.password,
    },
  });

  if (!user) {
    throw new HTTPException(401, { message: "邮箱或密码错误" });
  }

  const resp = successResponse(
    {
      id: user.id,
      email: user.email,
    },
    "登录成功"
  )
  console.log("login resp: ", resp)
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
}