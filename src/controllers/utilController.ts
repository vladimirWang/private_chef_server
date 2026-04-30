import type { Context } from "hono";
import { client } from "../plugins/oss";
import { successResponse } from "../models/Response";

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

function getPresignUrl() {

}

export const uploadFile = async (c: Context) => {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file uploaded" }, 400);
    }
    if (file.size === 0) {
      return c.json({ error: "Empty file" }, 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const objectKey = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${sanitizeFilename(file.name)}`;
    try {
      const result = await client.put(objectKey, buffer,
    //     {
    //     headers: {
    //       "Content-Type": file.type || "application/octet-stream",
    //     },
    //   }
        );
        console.log("result: ", result)
      return c.json(successResponse({url: result.url}, "文件上传成功"));
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