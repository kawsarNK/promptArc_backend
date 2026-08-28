import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
export const uploadsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter(_req, file, cb) { cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)); } });
cloudinary.config({ cloud_name: env.cloudinaryCloudName, api_key: env.cloudinaryApiKey, api_secret: env.cloudinaryApiSecret });
uploadsRouter.post("/", requireAuth, upload.single("image"), asyncHandler(async (req, res) => { if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret)
    throw new HttpError(503, "Image uploads are not configured"); if (!req.file)
    throw new HttpError(400, "Choose a PNG, JPG, or WebP image under 5 MB"); const result = await new Promise((resolve, reject) => { const stream = cloudinary.uploader.upload_stream({ folder: "promptarc/prompts", resource_type: "image", transformation: [{ width: 1200, height: 675, crop: "limit", quality: "auto", fetch_format: "auto" }] }, (error, value) => error || !value ? reject(error || new Error("Upload failed")) : resolve(value)); stream.end(req.file.buffer); }); res.status(201).json({ url: result.secure_url }); }));
