import { fileURLToPath } from "url";
import { generateGrpcClient } from "./grpcCommon";

// const KNOWLEDGE_BASE_PROTO_PATH = fileURLToPath(
//   new URL("../../proto/knowledge_base.proto", import.meta.url),
// );

// /** 与 ruoyi-backend CHEFADMIN_KNOWLEDGE_BASE_GRPC_PORT（默认 50053）一致 */
// const GRPC_ADDR =
//   process.env.CHEFADMIN_KNOWLEDGE_BASE_GRPC_ADDR || "127.0.0.1:50053";

// const client = generateGrpcClient({
//   protoPath: KNOWLEDGE_BASE_PROTO_PATH,
//   packageName: "chefadmin",
//   serviceName: "KnowledgeService",
//   grpcAddr: GRPC_ADDR,
// });

// export const knowledgeBaseGrpc = {
//   /** Unary RPC：调用 ruoyi KnowledgeService/Update */
//   update: (req: { filepath: string }) =>
//     new Promise<{ message: string }>((resolve, reject) => {
//       client.Update(req, (err: Error | null, resp: { message: string }) => {
//         if (err) reject(err);
//         else resolve(resp);
//       });
//     }),
// };
