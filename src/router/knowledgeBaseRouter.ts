import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { JwtVariables } from "hono/jwt";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { chatGrpc } from "../grpc/chatClient";
import { agentUserGrpc } from "../grpc/agentUserClient";
import { errorResponse, successResponse } from "../models/Response";

type JwtPayload = { userId: number };
const router = new Hono<{ Variables: JwtVariables<JwtPayload> }>();

const streamSchema = z.object({
  message: z.string().min(1),
  // 对齐 proto 字段名：image_url
  image_url: z.string().optional().default(""),
  thread_id: z.string().min(1),
});

const threadIdSchema = z.string().min(1);

/** 与前端 chatConsult 对齐：question 必填 */
const updateKnowledgeBaseBodySchema = z.object({
  filepath: z.string().min(1),
});

router.post(
  "/update",
  zValidator("json", updateKnowledgeBaseBodySchema, (result, c) => {
    if (!result.success) {
      return c.text('Invalid!', 400)
    }
  }),
  async (c) => {
    const filepath = c.req.valid("json").filepath
    const res = await agentUserGrpc.updateKnowledgeBase({filepath: filepath});
    console.log("----updateKnowledgeBase res-----: ", res);
    return c.json({
      message: res.message ?? "success",
    })
  }
);

export default router;

