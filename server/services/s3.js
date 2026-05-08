const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let s3Client = null;
const BUCKET = process.env.S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION || 'us-east-1';

function getClient() {
  if (s3Client) return s3Client;

  const accessKeyId     = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey || !BUCKET) {
    return null;
  }

  s3Client = new S3Client({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey },
  });

  return s3Client;
}

// Returns true if S3 is configured
function isConfigured() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && BUCKET);
}

// Upload a Buffer to S3. Returns the object key on success, null on failure.
async function uploadBuffer(buffer, key, contentType) {
  const client = getClient();
  if (!client) {
    console.log('[S3] Not configured — skipping upload');
    return null;
  }

  await client.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: contentType || 'application/octet-stream',
    // Server-side encryption at rest
    ServerSideEncryption: 'AES256',
  }));

  console.log('[S3] Uploaded:', key, `(${Math.round(buffer.length / 1024)} KB)`);
  return key;
}

// Build a well-structured S3 key for a user's resume
// e.g. resumes/user@example.com/1715000000000-resume.pdf
function buildResumeKey(email, originalFilename) {
  const safeEmail = (email || 'unknown').toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  const ext       = (originalFilename || 'file').split('.').pop().toLowerCase();
  const ts        = Date.now();
  return `resumes/${safeEmail}/${ts}-resume.${ext}`;
}

// Generate a pre-signed GET URL valid for `expiresIn` seconds (default 1 hour)
async function getPresignedUrl(key, expiresIn = 3600) {
  const client = getClient();
  if (!client || !key) return null;

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  );
  return url;
}

module.exports = { isConfigured, uploadBuffer, buildResumeKey, getPresignedUrl };
