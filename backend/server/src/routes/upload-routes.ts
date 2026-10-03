import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authMiddleware } from "../middleware/auth";
import { authorize } from "../middleware/rbac-middleware";
import { uploadBufferToR2 } from "../config/r2";
import { randomUUID } from "crypto";

const router = Router();

const isSvgUpload = (file: Express.Multer.File) => {
  const mime = String(file.mimetype || "").toLowerCase();
  const ext = path.extname(String(file.originalname || "")).toLowerCase();
  return mime === "image/svg+xml" || mime.includes("svg") || ext === ".svg";
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed."));
      return;
    }
    if (isSvgUpload(file)) {
      cb(new Error("SVG uploads are not allowed."));
      return;
    }
    cb(null, true);
  },
});

router.use(authMiddleware);
router.use(authorize("ADMIN", "PROGRAMMER", "OPERATOR", "QC"));

router.post("/image", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Image file is required. Use the 'image' field." });
    }

    if (isSvgUpload(file)) {
      return res.status(400).json({ message: "SVG uploads are not allowed." });
    }

    try {
      const uploaded = await uploadBufferToR2(file.buffer, file.mimetype, "uploads/images", file.originalname);
      return res.status(201).json({
        message: "Image uploaded successfully to R2",
        url: uploaded.url,
        key: uploaded.key,
      });
    } catch (r2Error: any) {
      // Fallback to local storage if R2 is not configured
      console.warn("R2 Upload failed/skipped. Falling back to local storage:", r2Error.message);

      const ext = path.extname(file.originalname) || `.${file.mimetype.split("/")[1]}`;
      const fileName = `${Date.now()}-${randomUUID()}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "images");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, file.buffer);

      return res.status(201).json({
        message: "Image uploaded successfully to local storage",
        url: `/uploads/images/${fileName}`,
        key: `uploads/images/${fileName}`,
      });
    }

  } catch (error: any) {
    console.error("Error uploading image:", error);
    return res.status(500).json({
      message: error?.message || "Error uploading image",
    });
  }
});

export default router;
