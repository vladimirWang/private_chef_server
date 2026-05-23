import { Hono } from "hono";
import type { JwtVariables } from "hono/jwt";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { errorResponse, successResponse } from "../models/Response";
import prisma from "../plugins/prisma";

type JwtPayload = { userId: number };
const router = new Hono<{ Variables: JwtVariables<JwtPayload> }>();

const createDishSchema = z.object({
  image_urls: z.array(z.string().min(1)).min(1),
  title: z.string().optional(),
  content: z.string().min(1),
});

function getUserId(c: { get: (key: "jwtPayload") => JwtPayload | undefined }) {
  const payload = c.get("jwtPayload");
  const rawId = payload?.userId;
  if (rawId == null || !Number.isFinite(Number(rawId))) return null;
  return Number(rawId);
}

router.post(
  "/",
  zValidator("json", createDishSchema, (result, c) => {
    if (!result.success) {
      return c.json(errorResponse(400, "请求参数错误", result.error.issues), 400);
    }
  }),
  async (c) => {
    const userId = getUserId(c);
    if (userId == null) {
      return c.json(errorResponse(401, "未登录或 token 无效"), 401);
    }

    const body = c.req.valid("json");

    const dish = await prisma.dish.create({
      data: {
        userId,
        imageUrl: body.image_urls, //['a', 'b'], //  body.image_urls,
        title: body.title?.trim() || null,
        content: body.content.trim(),
      },
      // include: {
      //   user: { select: { email: true } },
      // },
    });

    return c.json(successResponse({ dish: formatDish(dish) }));
  },
);

router.get("/list", async (c) => {
  const userId = getUserId(c);
  if (userId == null) {
    return c.json(errorResponse(401, "未登录或 token 无效"), 401);
  }

  const dishes = await prisma.dish.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true } },
    },
  });

  return c.json(successResponse({ dishes: dishes.map(formatDish) }));
});

function formatDish(dish: {
  id: number;
  imageUrl: string[];
  title: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  viewCount?: number;
  user?: { email: string };
}) {
  const email = dish.user?.email ?? "";
  return {
    id: dish.id,
    image_urls: dish.imageUrl,
    title: dish.title,
    content: dish.content,
    view_count: dish.viewCount ?? 0,
    created_at_ms: dish.createdAt.getTime(),
    updated_at_ms: dish.updatedAt.getTime(),
    deleted_at_ms: dish.deletedAt?.getTime() ?? null,
    user: {
      email,
      display_name: email.includes("@") ? email.split("@")[0] : email,
    },
  };
}

export default router;
