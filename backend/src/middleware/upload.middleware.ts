import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { RESUMES_DIR, UPLOADS_DIR } from '../lib/uploads-dir';

const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const ALLOWED_RESUME_EXTS = new Set(['.pdf', '.doc', '.docx']);
const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv']);

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Generates a clean, human-readable, safe filename that preserves the original
 * file name while preventing directory traversal, illegal filesystem/URL characters,
 * and duplicate file collisions.
 */
export function generateSafeUniqueFilename(dir: string, originalname: string): string {
    const rawExt = path.extname(originalname).toLowerCase().replace(/[^a-z0-9.]/gi, '');
    const rawBase = path.basename(originalname, path.extname(originalname));

    // Convert spaces and unsafe characters to hyphens; retain alphanumeric, underscores, hyphens
    let cleanBase = rawBase
        .trim()
        .replace(/[^\w.-]+/g, '-')     // replace spaces/symbols with hyphens
        .replace(/--+/g, '-')          // collapse consecutive hyphens
        .replace(/^-+|-+$/g, '');      // trim leading/trailing hyphens

    // Fallback if the filename had only special symbols or was empty
    if (!cleanBase) {
        cleanBase = `file-${Date.now()}`;
    }

    // Check for collisions in the destination directory
    let candidate = `${cleanBase}${rawExt}`;
    let counter = 1;
    while (fs.existsSync(path.join(dir, candidate))) {
        candidate = `${cleanBase}-${counter}${rawExt}`;
        counter++;
        if (counter > 1000) {
            candidate = `${cleanBase}-${Date.now()}${rawExt}`;
            break;
        }
    }

    return candidate;
}

const createStorage = (folder: string) =>
    multer.diskStorage({
        destination: (_req, _file, cb) => {
            const dir = path.join(UPLOADS_DIR, folder);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (_req, file, cb) => {
            const dir = path.join(UPLOADS_DIR, folder);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            cb(null, generateSafeUniqueFilename(dir, file.originalname));
        },
    });

export const uploadImage = multer({
    storage: createStorage('images'),
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/gi, '');
        if (file.mimetype.startsWith('image/') && ALLOWED_IMAGE_EXTS.has(ext)) cb(null, true);
        else cb(new Error('Only valid image files (JPG, PNG, WEBP, GIF) are allowed'));
    },
});

export const uploadMedia = multer({
    storage: createStorage('media'),
    limits: { fileSize: MAX_VIDEO_SIZE_BYTES }, // 100 MB stream max allowance
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/gi, '');
        const isImage = file.mimetype.startsWith('image/') && ALLOWED_IMAGE_EXTS.has(ext);
        const isVideo = file.mimetype.startsWith('video/') && ALLOWED_VIDEO_EXTS.has(ext);
        if (isImage || isVideo) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file format. Supported: Images (JPG, PNG, WEBP, GIF) and Videos (MP4, WebM, MOV, MKV)'));
        }
    },
});

// Backward-compatible alias
export const uploadMediaImage = uploadMedia;

/**
 * Enforces strict per-type file size limits (5 MB for images, 100 MB for videos).
 * Removes invalid files from disk immediately to prevent storage leakage.
 */
export function validateMediaFileSize(file: Express.Multer.File): { valid: boolean; error?: string } {
    const isVideo = file.mimetype.startsWith('video/');
    if (!isVideo && file.size > MAX_IMAGE_SIZE_BYTES) {
        if (file.path && fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch { /* ignore */ }
        }
        return {
            valid: false,
            error: `Image size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 5 MB limit. Please compress or select a smaller image under 5 MB.`,
        };
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
        if (file.path && fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch { /* ignore */ }
        }
        return {
            valid: false,
            error: `Video size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 100 MB limit. Please trim or compress the video.`,
        };
    }
    return { valid: true };
}

export const uploadPDF = multer({
    storage: createStorage('catalogues'),
    limits: { fileSize: 200 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (file.mimetype === 'application/pdf' && ext === '.pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'));
    },
});

export const uploadDocument = multer({
    storage: createStorage('documents'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (file.mimetype === 'application/pdf' && ext === '.pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'));
    },
});

export const uploadResume = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => {
            if (!fs.existsSync(RESUMES_DIR)) fs.mkdirSync(RESUMES_DIR, { recursive: true });
            cb(null, RESUMES_DIR);
        },
        filename: (_req, file, cb) => {
            if (!fs.existsSync(RESUMES_DIR)) fs.mkdirSync(RESUMES_DIR, { recursive: true });
            cb(null, generateSafeUniqueFilename(RESUMES_DIR, file.originalname));
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(file.mimetype) && ALLOWED_RESUME_EXTS.has(ext)) cb(null, true);
        else cb(new Error('Resume must be a valid PDF, DOC, or DOCX file'));

    },
});
