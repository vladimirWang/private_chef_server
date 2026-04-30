import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "url";

const GRPC_ADDR = process.env.PRIVATE_CHEF_GRPC_ADDR || "127.0.0.1:50051";
const PROTO_PATH = fileURLToPath(new URL("../../proto/chat.proto", import.meta.url));

// 运行时加载 proto，避免在 Bun 侧做代码生成。
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcPkg: any = grpc.loadPackageDefinition(packageDefinition);
const ChatService = grpcPkg.privatechef.chat.ChatService;

const chatClient = new ChatService(GRPC_ADDR, grpc.credentials.createInsecure());

export const chatGrpc = {
  streamChat: (req: any) => chatClient.StreamChat(req),

  getChatMessages: (req: any) =>
    new Promise<any>((resolve, reject) => {
      chatClient.GetChatMessages(req, (err: any, resp: any) => {
        if (err) reject(err);
        else resolve(resp);
      });
    }),

  clearChatMessages: (req: any) =>
    new Promise<any>((resolve, reject) => {
      chatClient.ClearChatMessages(req, (err: any, resp: any) => {
        if (err) reject(err);
        else resolve(resp);
      });
    }),
};

