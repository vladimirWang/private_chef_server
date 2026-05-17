import { fileURLToPath } from "url";
import {generateGrpcClient} from "./grpcCommon";

const USER_PROTO_PATH = fileURLToPath(
  new URL("../../proto/agent_user.proto", import.meta.url),
);

const client = generateGrpcClient(USER_PROTO_PATH);

export const agentUserGrpc = {
  /** Server streaming：与 chatGrpc.streamChat 用法一致，返回 ClientReadableStream */
  consultStream: (req: { user_id: number; question: string }) =>
    client.Consult(req),

  /** Unary RPC：grpc-js 必须传 callback，不能 client.UpdateKnowledge(req) 后直接 await */
  updateKnowledgeBase: (req: { filepath: string }) =>
    new Promise<{ message: string }>((resolve, reject) => {
      client.UpdateKnowledge(req, (err: Error | null, resp: { message: string }) => {
        if (err) reject(err);
        else resolve(resp);
      });
    }),
};
