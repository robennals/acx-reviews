/**
 * One-time R2 bucket CORS setup for narration audio.
 *
 * The AudioPlayer fetches {slug}.words.json from the public R2 domain with
 * fetch(), which requires CORS (the <audio> element itself does not). All
 * bucket content is already public-read, so a permissive GET-only rule is
 * appropriate. Prints any existing config before writing.
 *
 * Usage: pnpm exec tsx scripts/setup-r2-cors.ts
 */
import { config as loadEnv } from 'dotenv';
import {
  S3Client,
  GetBucketCorsCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function main() {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${requireEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });
  const bucket = requireEnv('R2_BUCKET');

  try {
    const existing = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    console.log('Existing CORS config:', JSON.stringify(existing.CORSRules, null, 2));
  } catch (err: unknown) {
    const e = err as { name?: string };
    if (e?.name !== 'NoSuchCORSConfiguration') throw err;
    console.log('No existing CORS config.');
  }

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ['*'],
            AllowedMethods: ['GET', 'HEAD'],
            AllowedHeaders: ['Range'],
            MaxAgeSeconds: 86400,
          },
        ],
      },
    })
  );
  console.log(`Set GET/HEAD CORS rule (origin *) on bucket ${bucket}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
