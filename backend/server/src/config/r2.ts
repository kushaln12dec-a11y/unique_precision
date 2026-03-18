import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
  R2_REGION,
} = process.env;

export const getR2BucketName = (): string => {
  if (!R2_BUCKET) {
    throw new Error("R2 configuration is incomplete. Set R2_BUCKET.");
  }
  return R2_BUCKET;
};

export const getR2Client = (): S3Client => {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error(
      "R2 configuration is incomplete. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET."
    );
  }

  return new S3Client({
    region: R2_REGION || "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
};

export const getPublicFileUrl = (key: string): string => {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }

  if (!R2_ACCOUNT_ID || !R2_BUCKET) {
    throw new Error("R2 public URL is not configured. Set R2_PUBLIC_URL or R2_ACCOUNT_ID and R2_BUCKET.");
  }

  return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
};

const mimeToExt = (mime: string): string => {
  const normalized = mime.toLowerCase();
  if (normalized === "image/jpeg") return "jpg";
  if (normalized === "image/jpg") return "jpg";
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/gif") return "gif";
  if (normalized === "image/svg+xml") return "svg";
  if (normalized === "application/pdf") return "pdf";
  return "bin";
};

export const uploadBufferToR2 = async (
  buffer: Buffer,
  mimeType: string,
  keyPrefix: string,
  fileName?: string
): Promise<{ key: string; url: string }> => {
  const bucket = getR2BucketName();
  const client = getR2Client();
  const ext = mimeToExt(mimeType);
  const safeFileName = String(fileName || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
  const fileToken = safeFileName ? `${Date.now()}-${safeFileName}` : `${Date.now()}-${randomUUID()}.${ext}`;
  const key = `${keyPrefix.replace(/^\/+|\/+$/g, "")}/${fileToken}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return {
    key,
    url: getPublicFileUrl(key),
  };
};
