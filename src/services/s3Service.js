import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucketName = process.env.REACT_APP_AWS_STORAGE_BUCKET_NAME;
const s3Client = new S3Client({
  region: process.env.REACT_APP_AWS_S3_REGION_NAME,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  },
});

const sanitizeFilename = (filename) => {
  return filename.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "");
};

export const getFileDownloadUrl = async (
  fileName,
  expirationSeconds = 3600
) => {
  const key = `media/converted_files/${sanitizeFilename(fileName)}`;
  console.log(key);

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${key}"`,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expirationSeconds,
    });
    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
};
