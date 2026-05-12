import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "url";

/** 与 agent 上 PRIVATE_CHEF_AGENT_USER_GRPC_PORT（默认 50052）一致 */
const GRPC_ADDR =
  process.env.PRIVATE_CHEF_AGENT_USER_GRPC_ADDR || "127.0.0.1:50052";
const PROTO_PATH = fileURLToPath(
  new URL("../../proto/agent_user.proto", import.meta.url),
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcPkg: any = grpc.loadPackageDefinition(packageDefinition);
const AgentUserService = grpcPkg.privatechef.agent.AgentUserService;

const client = new AgentUserService(
  GRPC_ADDR,
  grpc.credentials.createInsecure(),
);

export const agentUserGrpc = {
  pingUser: (userId: number, question: string) =>
    new Promise<{ message: string }>((resolve, reject) => {
      client.PingUser({ user_id: userId, question: question }, (err: any, resp: any) => {
        if (err) reject(err);
        else resolve(resp);
      });
    }),
};
