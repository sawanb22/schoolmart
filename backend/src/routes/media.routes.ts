import { Router, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { uploadMedia, validateMediaFileSize } from '../middleware/upload.middleware';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Upload rate limiter: 60 uploads per 15 minutes per IP (skipped in test)
const mediaUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Too many upload attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const TARGET_VARIANT_WIDTHS = [480, 960, 1600] as const;

let sharpWarningLogged = false;

export function resetSharpWarningState(): void {
    sharpWarningLogged = false;
}

export async function generateUploadVariants(file: Express.Multer.File): Promise<Record<string, string> | undefined> {
    const isSupportedImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (!isSupportedImage) {
        return undefined;
    }

    try {
        let sharpModule: any;
        try {
            sharpModule = await import('sharp');
        } catch (importErr: any) {
            if (!sharpWarningLogged) {
                console.warn('[media.routes] Warning: sharp could not be loaded dynamically. Skipping variant generation.', importErr?.message || importErr);
                sharpWarningLogged = true;
            }
            return undefined;
        }

        const sharp = sharpModule?.default || sharpModule;
        if (typeof sharp !== 'function') {
            return undefined;
        }

        const filePath = file.path;
        const imageInstance = sharp(filePath);
        const metadata = await imageInstance.metadata();
        const originalWidth = metadata?.width || 0;

        const ext = path.extname(file.filename);
        const base = path.basename(file.filename, ext);
        const dir = file.destination || path.dirname(filePath);

        const variants: Record<string, string> = {};

        for (const width of TARGET_VARIANT_WIDTHS) {
            if (originalWidth > width) {
                const variantFilename = `${base}-${width}.webp`;
                const variantPath = path.join(dir, variantFilename);
                await sharp(filePath)
                    .resize({ width })
                    .webp({ quality: 78 })
                    .toFile(variantPath);
                variants[width.toString()] = `/uploads/media/${variantFilename}`;
            }
        }

        if (Object.keys(variants).length > 0) {
            return variants;
        }
        return undefined;
    } catch (variantErr: any) {
        if (!sharpWarningLogged) {
            console.warn('[media.routes] Warning: Variant generation failed. Continuing without variants.', variantErr?.message || variantErr);
            sharpWarningLogged = true;
        }
        return undefined;
    }
}

router.post(
    '/',
    mediaUploadLimiter,
    verifyToken,
    requireAdmin,
    (req: AuthRequest, res: Response, next: NextFunction) => {
        // Accept either 'media' or 'image' field for seamless frontend flexibility
        const upload = uploadMedia.fields([
            { name: 'media', maxCount: 1 },
            { name: 'image', maxCount: 1 },
        ]);
        upload(req, res, async (err: any) => {
            if (err) return next(err);
            const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
            const file = files?.media?.[0] || files?.image?.[0];
            if (!file) {
                res.status(400).json({ error: 'A media file (image or video) is required' });
                return;
            }

            // Enforce strict split limits (5MB for images, 100MB for videos)
            const sizeCheck = validateMediaFileSize(file);
            if (!sizeCheck.valid) {
                res.status(400).json({ error: sizeCheck.error });
                return;
            }

            const isVideo = file.mimetype.startsWith('video/');
            let variants: Record<string, string> | undefined = undefined;

            if (!isVideo) {
                variants = await generateUploadVariants(file);
            }

            res.status(201).json({
                url: `/uploads/media/${file.filename}`,
                filename: file.filename,
                mimetype: file.mimetype,
                isVideo,
                size: file.size,
                ...(variants ? { variants } : {}),
            });
        });
    }
);

export default router;
