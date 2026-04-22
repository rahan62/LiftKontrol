import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { isS3Configured, s3DeleteObject, s3GetObjectBuffer, s3PutObject } from "./s3";

/** Stored in DB: either a cwd-relative path (legacy) or `s3:${objectKey}`. */
export const S3_REF_PREFIX = "s3:" as const;

export type BlobCategory =
  | "contracts"
  | "periodic-controls"
  | "revisions"
  | "logos"
  | "documents"
  | "project-specs"
  | "revision-second-control";

export function isS3StorageRef(stored: string | null | undefined): boolean {
  return Boolean(stored?.startsWith(S3_REF_PREFIX));
}

export function s3KeyFromRef(stored: string): string {
  if (!isS3StorageRef(stored)) {
    throw new Error("Not an s3: storage reference");
  }
  return stored.slice(S3_REF_PREFIX.length);
}

/** İndirme başlığı için güvenli dosya adı. */
export function storedBlobBaseName(stored: string): string {
  return isS3StorageRef(stored) ? path.basename(s3KeyFromRef(stored)) : path.basename(stored);
}

export function guessContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export async function readStoredBlob(stored: string): Promise<Buffer> {
  if (isS3StorageRef(stored)) {
    if (!isS3Configured()) {
      throw new Error("Kayıt S3 üzerinde ancak ortamda S3 yapılandırması eksik.");
    }
    return s3GetObjectBuffer(s3KeyFromRef(stored));
  }
  const full = path.join(process.cwd(), stored);
  return fs.readFile(full);
}

export async function writeStoredBlob(opts: {
  tenantId: string;
  category: BlobCategory;
  originalFilename: string;
  bytes: Buffer;
  contentType?: string;
}): Promise<string> {
  const safe = opts.originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
  const fname = `${randomUUID()}-${safe}`;
  const ct = opts.contentType ?? guessContentType(safe);

  if (isS3Configured()) {
    const key = `${opts.tenantId}/${opts.category}/${fname}`;
    await s3PutObject(key, opts.bytes, ct);
    return `${S3_REF_PREFIX}${key}`;
  }

  const dir = path.join(process.cwd(), "uploads", opts.category, opts.tenantId);
  await fs.mkdir(dir, { recursive: true });
  const full = path.join(dir, fname);
  await fs.writeFile(full, opts.bytes);
  return path.relative(process.cwd(), full);
}

export async function deleteStoredBlob(stored: string | null | undefined): Promise<void> {
  if (!stored) return;
  if (isS3StorageRef(stored)) {
    if (!isS3Configured()) return;
    try {
      await s3DeleteObject(s3KeyFromRef(stored));
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await fs.unlink(path.join(process.cwd(), stored));
  } catch {
    /* ignore */
  }
}
