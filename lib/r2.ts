import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

let cachedClient: S3Client | null = null;

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key} environment variable`);
  }
  return value;
};

const getClient = (): S3Client => {
  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: getEnv('R2_ENDPOINT'),
    credentials: {
      accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
    },
  });

  return cachedClient;
};

const buildPublicUrl = (bucket: string, key: string): string => {
  const base = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (base) {
    return `${base.replace(/\/$/, '')}/${key}`;
  }
  const endpoint = getEnv('R2_ENDPOINT').replace(/\/$/, '');
  return `${endpoint}/${bucket}/${key}`;
};

/**
 * Upload a buffer to Cloudflare R2 and return its public URL.
 */
export const uploadToR2 = async (params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> => {
  const bucket = getEnv('R2_BUCKET');

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );

  return buildPublicUrl(bucket, params.key);
};

export const getObjectFromR2 = async (key: string) => {
  const bucket = getEnv('R2_BUCKET');

  return getClient().send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
};

export const getR2Bucket = () => getEnv('R2_BUCKET');
