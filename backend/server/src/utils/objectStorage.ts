import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
  R2_REGION,
} = process.env;

const getS3Client = () => {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error("R2 configuration is incomplete. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.");
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

const parseDataUrl = (dataUrl: string): { mime: string; buffer: Buffer } | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  try {
    const buffer = Buffer.from(base64, "base64");
    return { mime, buffer };
  } catch {
    return null;
  }
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

export const isDataUrl = (value: unknown): value is string => {
  return typeof value === "string" && value.startsWith("data:");
};

export const uploadDataUrl = async (dataUrl: string, keyPrefix: string): Promise<string> => {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    throw new Error("Invalid data URL payload.");
  }

  const ext = mimeToExt(parsed.mime);
  const key = `${keyPrefix}/${Date.now()}-${randomUUID()}.${ext}`;

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET!,
      Key: key,
      Body: parsed.buffer,
      ContentType: parsed.mime,
    })
  );

  if (!R2_PUBLIC_URL) {
    // Fallback to bucket endpoint if public URL not provided.
    return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
  }

  return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
};

export const resolveStoredFile = async (
  value: unknown,
  keyPrefix: string
): Promise<string | null> => {
  if (value === null || value === undefined || value === "") return null;
  if (isDataUrl(value)) {
    return uploadDataUrl(value, keyPrefix);
  }
  return String(value);
};
