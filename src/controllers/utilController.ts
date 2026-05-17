import type { Context } from "hono";
import { client } from "../plugins/oss";
import { successResponse } from "../models/Response";
import path from "node:path";
import fs from "node:fs";
import { RunMode } from "../runMode";
import prisma from "../plugins/prisma";
import crypto from "node:crypto";
import { redisClient } from "../plugins/redis";

type FileUploadBody = {
    file: Blob;
  };
  
  type LoginContext = Context<
    Record<string, never>,
    string,
    { out: { json: FileUploadBody } }
  >;

function sanitizeFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").slice(0, 200);
  const safe = base.replace(/[^\w.\-]/g, "_");
  return safe || "file";
}

// export const uploadFile = async (c: LoginContext) => {
//     const body = await c.req.parseBody()
//     const file = body['file'];
//     if (!file) {
//         return c.json({ error: "No file uploaded" }, 400);
//     }
//     const buffer = Buffer.from(await file.arrayBuffer());
//     console.log("fileUpload: ", file);
//     // const path = path.normalize(file.path);
//     // const result = await client.put(file.name, file.path);
//     return c.json({ message: "success" });

//     // try {
//     //     // 填写OSS文件完整路径和本地文件的完整路径。OSS文件完整路径中不能包含Bucket名称。
//     //     // 如果本地文件的完整路径中未指定本地路径，则默认从示例程序所属项目对应本地路径中上传文件。
//     //     const result = await client.put('exampleobject.txt', path.normalize('D:\\localpath\\examplefile.txt')
//     //     // 自定义headers
//     //     ,{headers}
//     //     );
//     //     console.log(result);
//     //   } catch (e) {
//     //     console.log(e);
//     //   }
// }

/** 百炼 / DashScope 会从云端拉取图片 URL；私有 OSS 桶的直接 object URL 会 403，需返回签名 URL */
const OSS_SIGNED_URL_EXPIRES_SEC = 86400; // 24h，足够完成一轮对话

export const uploadFile = async (c: Context) => {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file uploaded" }, 400);
    }
    if (file.size === 0) {
      return c.json({ error: "Empty file" }, 400);
    }
    console.log('-----process.env.BASE_URL: ', file.type)
    const buffer = Buffer.from(await file.arrayBuffer());


    const md5Value = crypto.createHash('md5').update(buffer).digest('hex');
    const existed = await prisma.knowledgeFile.findFirst({
      where: {
        md5: md5Value
      }
    })
    if (existed) {
      return c.json(successResponse({ url: existed.filepath }, "文件已存在，返回已存储的文件 URL"));
    }
    const objectKey = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${sanitizeFilename(file.name)}`;
    const mode = c.var.mode as RunMode;
    let url = ''
    try {
      if (mode === "local") {
        const filePath = path.join("static/uploaded", objectKey);
        fs.writeFileSync(filePath, buffer);
        const BASE_URL = process.env.BASE_URL!;
        url = `${BASE_URL}/${filePath}`
      } else {
        await client.put(objectKey, buffer);
        url = client.signatureUrl(objectKey, {
          expires: OSS_SIGNED_URL_EXPIRES_SEC,
          method: "GET",
        });
        console.log("Generated signed URL-----:", url);
        // return c.json(successResponse({ url }, "文件上传成功"));
      }
      await prisma.knowledgeFile.create({
        data: {
          filename: file.name,
          filepath: url,
          filetype: file.type,
          filesize: file.size,
          md5: md5Value
        }
      })
      return c.json(successResponse({url}, "文件上传成功"));
    } catch (e) {
      console.error("OSS upload failed:", e);
      return c.json({ error: "Upload failed" }, 500);
    }
  };

  export const downloadFile = async (c: Context) => {
    const objectName = ''
    const object = await client.get(objectName);
    // res.write(object.content);
    // 
    return c.json({});
  }

  export const verifyEmail = async (c: Context) => {
    // const body = await c.req.parseBody();
    const body = c.req.valid("json");
    const email = body.email;
    const code = body.code;
    console.log("body: ", body, JSON.stringify(body));
    console.log("email: ", email, "code: ", code);
    const verificationCode = await redisClient.get(`emailVerification:${email}`);
    console.log("verificationCode: ", verificationCode);
    if (verificationCode !== code) {
      return c.json(successResponse({ message: "验证码错误" }));
    }
    return c.json(successResponse({ message: "验证码正确" }));
  }