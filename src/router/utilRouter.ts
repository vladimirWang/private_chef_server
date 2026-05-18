import { Hono } from "hono";
import { client } from "../plugins/oss";
import { uploadFile, verifyEmail, getNonce } from "../controllers/utilController";
import { sendEmail } from "../plugins/mailer";
import { redisClient } from "../plugins/redis";
import {randomBytes} from "node:crypto";
import { z } from "zod";
import {zValidator} from '@hono/zod-validator'

const router = new Hono();

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});

router.post("/uploadFile", uploadFile)
.get("/sendEmailVerificationCode/:email", async (c) => {
    const email = c.req.param("email");
    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }
    const existed = await redisClient.get(`emailVerification:${email}`);
    if (existed) {
      await redisClient.setEx(`emailVerification:${email}`, 60 * 5, existed);
      return c.json({ message: "验证码已发送" });
    }
    const rnd = Math.random();
    const verificationCode = (rnd + "").slice(2, 6);
    redisClient.set(`emailVerification:${email}`, verificationCode, { EX: 60 * 5 });
    await sendEmail(email, "你的验证码已发送", `你的验证码是: ${verificationCode}`);
    return c.json({ message: "你的验证码已发送" });
})
.post("/verifyEmail", zValidator("json", verifyEmailSchema, (result) => {
  if (!result.success) {
    // throw result.error;
    return c.text('Invalid!', 400)
  }
}), verifyEmail)
.get("/get-nonce", getNonce);

export default router;