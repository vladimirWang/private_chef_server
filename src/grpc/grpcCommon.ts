import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

export type GrpcClientConfig = {
  protoPath: string;
  packageName: string;
  serviceName: string;
  grpcAddr: string;
};

export const generateGrpcClient = ({
  protoPath,
  packageName,
  serviceName,
  grpcAddr,
}: GrpcClientConfig) => {
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const grpcPkg: any = grpc.loadPackageDefinition(packageDefinition);
  const Service = grpcPkg[packageName][serviceName];

  return new Service(grpcAddr, grpc.credentials.createInsecure());
};
