import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import type { JwtVariables } from "hono/jwt";
import { z } from "zod";
import prisma from "../plugins/prisma";
import { successResponse, errorResponse } from "../models/Response";
import { decode, sign, verify } from 'hono/jwt'
import { redisClient } from "../plugins/redis";
import { generateFixedSalt, sha256 } from "../utils/algo";
import { resolveUserDisplayName } from "../utils/userDisplay";

const JWT_SECRET = process.env.JWT_SECRET!

type JwtPayload = { userId: number };

function getUserId(c: Context<{ Variables: JwtVariables<JwtPayload> }>): number | null {
  const rawId = c.get("jwtPayload")?.userId;
  if (rawId == null || !Number.isFinite(Number(rawId))) return null;
  return Number(rawId);
}

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

export const getUserInfo = async (c: Context<{ Variables: JwtVariables<JwtPayload> }>) => {
  const userId = getUserId(c);
  if (userId == null) {
    return c.json(errorResponse(401, "未登录或 token 无效"), 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      avatarUrl: true,
      nickname: true,
      likeCount: true,
    },
  });
  if (!user) {
    return c.json(errorResponse(404, "用户不存在"), 404);
  }

  const postCount = await prisma.dish.count({
    where: { userId, deletedAt: null },
  });

  return c.json(
    successResponse(
      {
        id: user.id,
        email: user.email,
        avatar_url: user.avatarUrl,
        like_count: user.likeCount,
        post_count: postCount,
        display_name: resolveUserDisplayName(user),
      },
      "获取用户信息成功",
    ),
  );
};

const updateProfileSchema = z.object({
  avatar_url: z.string().max(512).optional(),
  nickname: z
    .string()
    .trim()
    .min(1, "用户名不能为空")
    .max(32, "用户名最多 32 个字符")
    .optional(),
});

export const updateUserProfile = async (c: Context<{ Variables: JwtVariables<JwtPayload> }>) => {
  const userId = getUserId(c);
  if (userId == null) {
    return c.json(errorResponse(401, "未登录或 token 无效"), 401);
  }

  const body = updateProfileSchema.parse(await c.req.json());
  const data: { avatarUrl?: string | null; nickname?: string } = {};

  if (body.avatar_url !== undefined) {
    data.avatarUrl = body.avatar_url.trim() || null;
  }
  if (body.nickname !== undefined) {
    data.nickname = body.nickname.trim();
  }

  if (Object.keys(data).length === 0) {
    return c.json(errorResponse(400, "没有可更新的字段"), 400);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      avatarUrl: true,
      nickname: true,
      likeCount: true,
    },
  });

  const postCount = await prisma.dish.count({
    where: { userId, deletedAt: null },
  });

  return c.json(
    successResponse(
      {
        id: user.id,
        email: user.email,
        avatar_url: user.avatarUrl,
        like_count: user.likeCount,
        post_count: postCount,
        display_name: resolveUserDisplayName(user),
      },
      "更新成功",
    ),
  );
};

export const getUserSalt = async (c: Context) => {
  const email = c.req.param("email")
  const user = await prisma.user.findFirst({
    where: {
      email: email,
    },
  })
  return c.json(successResponse(user?.salt, "获取用户盐成功"));
}

const changePasswordSchema = z.object({
  old_password: z.string().min(1, "旧密码不能为空"),
  new_password: z.string().min(6, "新密码至少 6 位").max(128, "新密码最多 128 个字符"),
  nonce: z.string().min(1, "nonce 不能为空"),
});

export const changeUserPassword = async (c: Context<{ Variables: JwtVariables<JwtPayload> }>) => {
  const userId = getUserId(c);
  if (userId == null) {
    return c.json(errorResponse(401, "未登录或 token 无效"), 401);
  }

  const body = changePasswordSchema.parse(await c.req.json());

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true, salt: true },
  });
  if (!user) {
    return c.json(errorResponse(404, "用户不存在"), 404);
  }

  const calculatedOldPassword = sha256(user.password + "_" + body.nonce);
  if (calculatedOldPassword !== body.old_password) {
    return c.json(errorResponse(400, "旧密码错误"), 400);
  }

  const newPasswordHash = sha256(body.new_password + "_" + user.salt);
  await prisma.user.update({
    where: { id: userId },
    data: { password: newPasswordHash },
  });

  return c.json(successResponse(null, "密码修改成功"));
};