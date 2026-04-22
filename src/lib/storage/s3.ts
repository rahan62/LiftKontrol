import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let cached: S3Client | null = null;

/**
 * Supabase Storage S3 protocol URL (Dashboard → Storage → S3 connection).
 * See: https://supabase.com/docs/guides/storage/s3/authentication
 */
function resolveS3Endpoint(): string | undefined {
  const explicit =
    process.env.S3_ENDPOINT?.trim() ||
    process.env.AWS_S3_ENDPOINT?.trim() ||
    process.env.SUPABASE_STORAGE_S3_ENDPOINT?.trim();
  if (explicit) return explicit;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) return undefined;
  try {
    const u = new URL(base);
    const host = u.hostname;
    if (!host.endsWith(".supabase.co")) return undefined;
    const ref = host.slice(0, -".supabase.co".length);
    if (!ref || ref.includes(".")) return undefined;
    return `https://${ref}.storage.supabase.co/storage/v1/s3`;
  } catch {
    return undefined;
  }
}

/** Supabase requires path-style addressing for their S3-compatible API. */
function isSupabaseStorageS3Endpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    if (u.hostname.endsWith(".storage.supabase.co")) return true;
    if (u.pathname.includes("/storage/v1/s3")) return true;
  } catch {
    /* fall through */
  }
  return endpoint.includes("storage.supabase.co") || endpoint.includes("/storage/v1/s3");
}

function resolveForcePathStyle(endpoint: string | undefined): boolean {
  if (process.env.S3_FORCE_PATH_STYLE === "0" || process.env.S3_FORCE_PATH_STYLE === "false") {
    return false;
  }
  if (process.env.S3_FORCE_PATH_STYLE === "1" || process.env.S3_FORCE_PATH_STYLE === "true") {
    return true;
  }
  if (endpoint && isSupabaseStorageS3Endpoint(endpoint)) {
    return true;
  }
  return false;
}

/** Yer tutucu / örnek .env değerleri — S3 denenip 403 üretmesin, `uploads/` kullanılsın. */
function looksLikeInvalidS3Credential(value: string | undefined): boolean {
  if (value == null) return true;
  const v = value.trim();
  if (!v) return true;
  if (v.includes("<") || v.includes(">")) return true;
  if (/replace_me|your_|paste|example|changeme|xxx/i.test(v)) return true;
  return false;
}

/** True when bucket + region + static credentials are set (typical app server). */
export function isS3Configured(): boolean {
  const bucket = (process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET)?.trim();
  const region = (process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION)?.trim();
  const access = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !region || !access || !secret) return false;
  if (looksLikeInvalidS3Credential(access) || looksLikeInvalidS3Credential(secret)) return false;
  return true;
}

export function getS3Bucket(): string {
  return process.env.S3_BUCKET ?? process.env.AWS_S3_BUCKET ?? "";
}

function getClient(): S3Client {
  if (!cached) {
    const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "eu-central-1";
    const endpoint = resolveS3Endpoint();
    cached = new S3Client({
      region,
      ...(endpoint
        ? {
            endpoint,
            forcePathStyle: resolveForcePathStyle(endpoint),
          }
        : {}),
    });
  }
  return cached;
}

export async function s3PutObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const bucket = getS3Bucket();
  if (!bucket) throw new Error("S3_BUCKET is not set");
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function s3GetObjectBuffer(key: string): Promise<Buffer> {
  const bucket = getS3Bucket();
  if (!bucket) throw new Error("S3_BUCKET is not set");
  const out = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!out.Body) throw new Error("Empty S3 object body");
  const bytes = await out.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function s3DeleteObject(key: string): Promise<void> {
  const bucket = getS3Bucket();
  if (!bucket) return;
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
