/**
 * Thin wrapper around the Cloudflare R2 S3-compatible API for image uploads.
 *
 * Loads credentials from environment variables (expects dotenv to have been
 * called before this module is imported). Provides content-addressed uploads
 * with a HEAD-then-PUT pattern for idempotency.
 */

import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let cachedClient: S3Client | null = null;
let cachedBucket: string | null = null;
let cachedPublicBase: string | null = null;

function getClient(): { client: S3Client; bucket: string; publicBase: string } {
  if (cachedClient && cachedBucket && cachedPublicBase) {
    return { client: cachedClient, bucket: cachedBucket, publicBase: cachedPublicBase };
  }
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
  cachedBucket = requireEnv('R2_BUCKET');
  cachedPublicBase = requireEnv('R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return { client: cachedClient, bucket: cachedBucket, publicBase: cachedPublicBase };
}

/**
 * Upload an object to R2 if it doesn't already exist.
 * Returns the public URL.
 */
export async function uploadIfMissing(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ url: string; uploaded: boolean }> {
  const { client, bucket, publicBase } = getClient();
  const url = `${publicBase}/${key}`;

  // HEAD first — if exists, skip upload.
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { url, uploaded: false };
  } catch (err: unknown) {
    // 404 (NotFound) means we need to upload. Any other error propagates.
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    const notFound = e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404;
    if (!notFound) throw err;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { url, uploaded: true };
}
