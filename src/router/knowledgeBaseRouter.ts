import { Hono } from "hono";
import type { JwtVariables } from "hono/jwt";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
// import { knowledgeBaseGrpc } from "../grpc/knowledgeBaseClient";
import { errorResponse, successResponse } from "../models/Response";

type JwtPayload = { userId: number };
const router = new Hono<{ Variables: JwtVariables<JwtPayload> }>();

const updateKnowledgeBaseBodySchema = z.object({
  filepath: z.string().min(1),
});

// router.post(
//   "/update",
//   // zValidator("json", updateKnowledgeBaseBodySchema, (result, c) => {
//   //   if (!result.success) {
//   //     return c.text('Invalid!', 400)
//   //   }
//   // }),
//   async (c) => {
//     const { filepath } = c.req.valid("json");
//     try {
//       const res = await knowledgeBaseGrpc.update({ filepath });
//       return c.json(
//         successResponse({ message: res.message ?? "success" }, "更新知识库成功"),
//       );
//     } catch (err) {
//       console.error("knowledgeBase/update gRPC error:", err);
//       const message =
//         err instanceof Error ? err.message : "更新知识库失败";
//       return c.json(errorResponse(502, message), 502);
//     }
//   },
// );

export default router;
