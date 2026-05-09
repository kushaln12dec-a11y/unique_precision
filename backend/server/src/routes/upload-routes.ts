import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth";
import { uploadBufferToR2 } from "../config/r2";

const router = Router();

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
    cb(null, true);
  },
});

router.use(authMiddleware);

router.post("/image", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Image file is required. Use the 'image' field." });
    }

    const uploaded = await uploadBufferToR2(file.buffer, file.mimetype, "uploads/images", file.originalname);

    return res.status(201).json({
      message: "Image uploaded successfully",
      url: uploaded.url,
      key: uploaded.key,
    });
  } catch (error: any) {
    console.error("Error uploading image:", error);
    return res.status(500).json({
      message: error?.message || "Error uploading image",
    });
  }
});

export default router;
