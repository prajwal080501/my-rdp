const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

// endpoint left undefined for real AWS S3; set S3_ENDPOINT for a self-hosted
// MinIO instance instead.
const client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: Boolean(process.env.S3_ENDPOINT),
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
})

const PUT_URL_TTL_SECONDS = 15 * 60

async function getUploadUrl(objectKey, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: objectKey,
    ContentType: contentType
  })
  return getSignedUrl(client, command, { expiresIn: PUT_URL_TTL_SECONDS })
}

module.exports = { getUploadUrl }
