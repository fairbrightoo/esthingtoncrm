import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// R2 Config from Environment Variables
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || 'esthington-os';
const publicUrlPrefix = process.env.R2_PUBLIC_URL_PREFIX;

const isR2Configured = Boolean(accountId && accessKeyId && secretAccessKey);

export const s3Client = isR2Configured ? new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: accessKeyId as string,
        secretAccessKey: secretAccessKey as string,
    },
}) : null;

/**
 * Uploads a file natively to Cloudflare R2 if configured, otherwise falls back to local disk.
 * @param buffer The file buffer from Multer
 * @param originalname The uploaded file name (e.g. photo.jpg)
 * @param prefix Functional folder prefix (e.g. 'passport', 'cv', 'logo')
 * @returns The publicly accessible URL of the uploaded file
 */
export async function uploadFile(buffer: Buffer, originalname: string, prefix: string): Promise<string> {
    const ext = originalname.includes('.') ? originalname.substring(originalname.lastIndexOf('.')) : '';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    if (isR2Configured && s3Client) {
        const filename = `${prefix}/${uniqueSuffix}${ext}`; // e.g. logo/123.jpg
        try {
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: filename,
                Body: buffer,
                ContentType: getContentType(ext)
            });
            await s3Client.send(command);
            
            // We use the public URL mapped via Cloudflare (e.g. https://cdn.esthington.org/logo/123.jpg)
            return `${publicUrlPrefix?.replace(/\/$/, '')}/${filename}`;
        } catch (error) {
            console.error('R2 Cloud Upload Error:', error);
            throw new Error('Failed to upload file to Cloud Storage');
        }
    } else {
        // Fallback local robust write logic
        const safeFilename = `${prefix}-${uniqueSuffix}${ext}`;
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const filepath = path.join(uploadDir, safeFilename);
        fs.writeFileSync(filepath, buffer);
        console.log(`[StorageService] S3 not configured. Saved locally to ${filepath}`);
        return `/uploads/${safeFilename}`;
    }
}

function getContentType(ext: string): string {
    const map: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.pdf': 'application/pdf',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
}
