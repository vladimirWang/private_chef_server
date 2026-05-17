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
const consultBodySchema = z.object({
  question: z.string().min(1),
});

const textEncoder = new TextEncoder();

/** gRPC ClientReadableStream → ReadableStream；须 bind controller，否则 Bun 下 enqueue 报 ERR_INVALID_THIS */
function grpcCallToReadableStream(
  call: {
    on(event: "data", listener: (chunk: unknown) => void): unknown;
    on(event: "error", listener: (err: Error) => void): unknown;
    on(event: "end", listener: () => void): unknown;
  },
  onData: (resp: unknown, push: (bytes: Uint8Array) => void) => void,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const push = controller.enqueue.bind(controller);
      const close = controller.close.bind(controller);
      const fail = controller.error.bind(controller);
      call.on("data", (resp) => onData(resp, push));
      call.on("error", (err) => fail(err));
      call.on("end", () => close());
    },
  });
}

const sseHeaders = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

router.post(
  "/consult",
  zValidator("json", consultBodySchema, (result, c) => {
    if (!result.success) {
      return c.text('Invalid!', 400)
    }
  }),
  async (c) => {
    const body = c.req.valid("json")
    console.log("pass body: ", body);
    const payload = c.get("jwtPayload") as JwtPayload | undefined;
    const rawId = payload?.userId;
    if (rawId == null || !Number.isFinite(Number(rawId))) {
      return c.json(errorResponse(401, "未登录或 token 无效"), 401);
    }
    const userId = Number(rawId);
    const question = body.question?.trim() ?? "";
    if (!question) {
      return c.json(errorResponse(400, "question 不能为空"), 400);
    }

    try {
      const call = agentUserGrpc.consultStream({
        user_id: userId,
        question,
      });
      const stream = grpcCallToReadableStream(call, (resp, push) => {
        const r = resp as { chunk?: string; done?: boolean };
        if (r?.chunk != null && r.chunk !== "") {
          push(textEncoder.encode(`data: ${JSON.stringify(r.chunk)}\n\n`));
        }
        if (r?.done) {
          push(textEncoder.encode('data: {"done": true}\n\n'));
        }
      });

      return new Response(stream, { headers: sseHeaders });
    } catch (err: any) {
      console.error("grpc PingUser stream failed:", err);
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

    const stream = grpcCallToReadableStream(call, (resp, push) => {
      const r = resp as { chunk?: string };
      if (r?.chunk) push(textEncoder.encode(r.chunk));
    });

    return new Response(stream, { headers: sseHeaders });
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

