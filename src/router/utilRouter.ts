import { Hono } from "hono";
import { client } from "../plugins/oss";
import { uploadFile } from "../controllers/utilController";

const router = new Hono();

router.post("/uploadFile", uploadFile);

export default router;