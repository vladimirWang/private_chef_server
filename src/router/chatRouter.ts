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

/** 与前端 chatConsult 对齐：可带 question，gRPC 仅使用 JWT 中的 userId */
const consultBodySchema = z.object({
  question: z.string(),
});

router.post(
  "/consult",
  zValidator("json", consultBodySchema, (result) => {
    if (!result.success) throw result.error;
  }),
  async (c) => {
    const body = c.req.valid("json");
    const payload = c.get("jwtPayload") as JwtPayload | undefined;
    const rawId = payload?.userId;
    if (rawId == null || !Number.isFinite(Number(rawId))) {
      return c.json(errorResponse(401, "未登录或 token 无效"), 401);
    }
    const userId = Number(rawId);
    try {
      const grpcResp = await agentUserGrpc.pingUser(
        userId,
        body.question ?? ""
      );
      return c.json(
        successResponse(
          { message: grpcResp?.message ?? "" },
          "success"
        )
      );
    } catch (err: any) {
      console.error("grpc PingUser failed:", err);
      return c.json(
        errorResponse(500, "gRPC调用失败", {
          detail: err?.message ?? String(err),
        }),
        500
      );
    }
  }
);

router.post(
  "/stream",
  zValidator("json", streamSchema, (result) => {
    if (!result.success) {
      throw result.error;
    }
  }),
  async (c) => {
    const body = c.req.valid("json");
    const call = chatGrpc.streamChat({
      message: body.message,
      image_url: body.image_url ?? "",
      thread_id: body.thread_id,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        call.on("data", (resp: any) => {
          if (resp?.chunk) controller.enqueue(encoder.encode(resp.chunk));
        });
        call.on("error", (err: any) => controller.error(err));
        call.on("end", () => controller.close());
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }
);

router.get("/messages", async (c) => {
  const threadId = c.req.query("thread_id");
  const parsed = threadIdSchema.safeParse(threadId);
  if (!parsed.success) {
    throw new HTTPException(400, { message: "thread_id 不能为空" });
  }

  let resp: any;
  try {
    resp = await chatGrpc.getChatMessages({ thread_id: parsed.data });
  } catch (err: any) {
    console.error("grpc GetChatMessages failed:", err);
    return c.json(
      errorResponse(500, "gRPC调用失败", { detail: err?.message ?? String(err) }),
      500
    );
  }

  return c.json(
    successResponse({
      messages: (resp?.messages ?? []).map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    })
  );
});

router.delete("/messages", async (c) => {
  const threadId = c.req.query("thread_id");
  const parsed = threadIdSchema.safeParse(threadId);
  if (!parsed.success) {
    throw new HTTPException(400, { message: "thread_id 不能为空" });
  }

  try {
    await chatGrpc.clearChatMessages({ thread_id: parsed.data });
  } catch (err: any) {
    console.error("grpc ClearChatMessages failed:", err);
    return c.json(
      errorResponse(500, "gRPC调用失败", { detail: err?.message ?? String(err) }),
      500
    );
  }

  return c.json(
    successResponse({
      success: true,
    })
  );
});

export default router;

