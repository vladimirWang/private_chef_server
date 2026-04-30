import OSS from 'ali-oss';

export const client = new OSS({
    region: 'oss-cn-beijing', // Bucket 所在地域
    accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
    bucket: process.env.OSS_BUCKET!,
    authorizationV4: true
  });

