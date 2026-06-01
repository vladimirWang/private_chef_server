import { fileURLToPath } from "url";
import { generateGrpcClient } from "./grpcCommon";

const USER_PROTO_PATH = fileURLToPath(
  new URL("../../proto/agent_user.proto", import.meta.url),
);

/** 与 agent 上 PRIVATE_CHEF_AGENT_USER_GRPC_PORT（默认 50052）一致 */
const GRPC_ADDR =
  process.env.PRIVATE_CHEF_AGENT_USER_GRPC_ADDR || "127.0.0.1:50052";

const client = generateGrpcClient({
  protoPath: USER_PROTO_PATH,
  packageName: "agent",
  serviceName: "ChatService",
  grpcAddr: GRPC_ADDR,
});

export const agentUserGrpc = {
  /** Server streaming：与 chatGrpc.streamChat 用法一致，返回 ClientReadableStream */
  consultStream: (req: { user_id: number; question: string; session_id: string }) =>
    client.Consult(req),

  loadChatHistory: (req: any) =>
      new Promise<any>((resolve, reject) => {
        client.LoadChatHistory(req, (err: any, resp: any) => {
          if (err) reject(err);
          else resolve(resp);
        });
      }),
};
