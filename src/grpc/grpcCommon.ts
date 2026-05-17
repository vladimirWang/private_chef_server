import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "url";

/** 与 agent 上 PRIVATE_CHEF_AGENT_USER_GRPC_PORT（默认 50052）一致 */
const GRPC_ADDR =
  process.env.PRIVATE_CHEF_AGENT_USER_GRPC_ADDR || "127.0.0.1:50052";

export const generateGrpcClient = (protoPath: string) => {
    const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });
    const grpcPkg: any = grpc.loadPackageDefinition(packageDefinition);
    const ChatService = grpcPkg.agent.ChatService;

    return  new ChatService(
        GRPC_ADDR,
        grpc.credentials.createInsecure(),
    );
}