import { Hono } from "hono";
import type { JwtVariables } from "hono/jwt";
import { errorResponse, successResponse } from "../models/Response";
import prisma from "../plugins/prisma";
import { dishCoverImage, dishDisplayTitle } from "../utils/dishDisplay";
import { resolveUserDisplayName } from "../utils/userDisplay";

type JwtPayload = { userId: number };
const router = new Hono<{ Variables: JwtVariables<JwtPayload> }>();

const MAX_FOOTPRINT = 50;

function getUserId(c: { get: (key: "jwtPayload") => JwtPayload | undefined }) {
  const payload = c.get("jwtPayload");
  const rawId = payload?.userId;
  if (rawId == null || !Number.isFinite(Number(rawId))) return null;
  return Number(rawId);
}

function formatFootprintRow(row: {
  dishId: number;
  viewedAt: Date;
  dish: {
    imageUrl: string[];
    title: string | null;
    content: string;
    user: { email: string; nickname: string | null };
  };
}) {
  return {
    dish_id: row.dishId,
    title: dishDisplayTitle(row.dish),
    cover_url: dishCoverImage(row.dish.imageUrl),
    author_name: resolveUserDisplayName(row.dish.user),
    viewed_at_ms: row.viewedAt.getTime(),
  };
}

async function trimFootprintsToLimit(userId: number) {
  const count = await prisma.dishFootprint.count({ where: { userId } });
  if (count <= MAX_FOOTPRINT) return;

  const excess = await prisma.dishFootprint.findMany({
    where: { userId },
    orderBy: { viewedAt: "asc" },
    take: count - MAX_FOOTPRINT,
    select: { id: true },
  });

  if (excess.length > 0) {
    await prisma.dishFootprint.deleteMany({
      where: { id: { in: excess.map((row) => row.id) } },
    });
  }
}

router.get("/list", async (c) => {
  const userId = getUserId(c);
  if (userId == null) {
    return c.json(errorResponse(401, "未登录或 token 无效"), 401);
  }

  const rows = await prisma.dishFootprint.findMany({
    where: {
      userId,
      dish: { deletedAt: null },
    },
    orderBy: { viewedAt: "desc" },
    take: MAX_FOOTPRINT,
    select: {
      dishId: true,
      viewedAt: true,
      dish: {
        select: {
          imageUrl: true,
          title: true,
          content: true,
          user: { select: { email: true, nickname: true } },
        },
      },
    },
  });

  return c.json(
    successResponse({
      footprints: rows.map(formatFootprintRow),
    }),
  );
});

router.get("/count", async (c) => {
  const userId = getUserId(c);
  if (userId == null) {
    return c.json(errorResponse(401, "未登录或 token 无效"), 401);
  }

  const count = await prisma.dishFootprint.count({
    where: {
      userId,
      dish: { deletedAt: null },
    },
  });

  return c.json(successResponse({ count }));
});

router.delete("/", async (c) => {
  const userId = getUserId(c);
  if (userId == null) {
    return c.json(errorResponse(401, "未登录或 token 无效"), 401);
  }

  await prisma.dishFootprint.deleteMany({ where: { userId } });

  return c.json(successResponse(null, "已清空足迹"));
});

router.post("/:dishId", async (c) => {
  const userId = getUserId(c);
  if (userId == null) {
    return c.json(errorResponse(401, "未登录或 token 无效"), 401);
  }

  const dishId = Number(c.req.param("dishId"));
  if (!Number.isFinite(dishId)) {
    return c.json(errorResponse(400, "无效的菜品 ID"), 400);
  }

  const dish = await prisma.dish.findFirst({
    where: { id: dishId, deletedAt: null },
    select: { id: true },
  });
  if (!dish) {
    return c.json(errorResponse(404, "文章不存在或已删除"), 404);
  }

  await prisma.dishFootprint.upsert({
    where: {
      userId_dishId: { userId, dishId },
    },
    create: {
      userId,
      dishId,
      viewedAt: new Date(),
    },
    update: {
      viewedAt: new Date(),
    },
  });

  await trimFootprintsToLimit(userId);

  return c.json(successResponse(null, "已记录浏览足迹"));
});

router.delete("/:dishId", async (c) => {
  const userId = getUserId(c);
  if (userId == null) {
    return c.json(errorResponse(401, "未登录或 token 无效"), 401);
  }

  const dishId = Number(c.req.param("dishId"));
  if (!Number.isFinite(dishId)) {
    return c.json(errorResponse(400, "无效的菜品 ID"), 400);
  }

  await prisma.dishFootprint.deleteMany({
    where: { userId, dishId },
  });

  return c.json(successResponse(null, "已移除足迹"));
});

export default router;
