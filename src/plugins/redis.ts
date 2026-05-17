import { createClient, type RedisClientType } from "@redis/client";
// import { logger } from "./logger";

const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

function connectRedis() {
  return redisClient
    .on("error", (err: any) => {
      console.error("Redis error: ", err);
      // logger.error({ err: err?.message }, "Redis error");
    })
    .connect()
    .then((res: any) => {
      console.log("Redis 连接成功: ");
      // logger.info({ msg: "Redis 连接成功" });
      return res;
    })
    .catch((err: any) => {
      console.error("Redis 连接失败: ", err);
      // logger.error({ err: err?.message }, "Redis 连接失败");
      return Promise.reject(err);
    });
}
export { redisClient, connectRedis };
