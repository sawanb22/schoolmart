import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import app from '../../src/app';
import { getAdminToken } from '../helpers/auth';
import { UPLOADS_DIR } from '../../src/lib/uploads-dir';
import { generateUploadVariants, resetSharpWarningState } from '../../src/routes/media.routes';

describe('Media Upload & WebP Variants (T15)', () => {
    let adminToken: string;
    const createdFiles: string[] = [];

    beforeAll(async () => {
        adminToken = await getAdminToken();
    });

    afterAll(() => {
        // Clean up any test files created during test runs
        for (const relOrAbs of createdFiles) {
            try {
                const fullPath = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(UPLOADS_DIR, 'media', path.basename(relOrAbs));
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            } catch (err) {
                // Ignore cleanup errors
            }
        }
    });

    it('creates 3 WebP variants (480, 960, 1600) when uploading a 2000px wide image', async () => {
        // Create 2000x1200 fixture buffer in memory
        const fixtureBuffer = await sharp({
            create: {
                width: 2000,
                height: 1200,
                channels: 4,
                background: { r: 10, g: 100, b: 200, alpha: 1 },
            },
        })
            .png()
            .toBuffer();

        const res = await request(app)
            .post('/api/media')
            .set('Authorization', `Bearer ${adminToken}`)
            .attach('image', fixtureBuffer, 'test-hero-2000.png');

        expect(res.status).toBe(201);
        expect(res.body.url).toMatch(/^\/uploads\/media\/test-hero-2000.*\.png$/);
        expect(res.body.isVideo).toBe(false);
        expect(res.body.variants).toBeDefined();

        createdFiles.push(res.body.filename);

        const variants = res.body.variants;
        expect(variants['480']).toBeDefined();
        expect(variants['960']).toBeDefined();
        expect(variants['1600']).toBeDefined();

        // Verify variant files exist on disk and have expected widths
        for (const [wStr, variantUrl] of Object.entries(variants) as [string, string][]) {
            const expectedWidth = parseInt(wStr, 10);
            const variantFilename = path.basename(variantUrl);
            createdFiles.push(variantFilename);

            const diskPath = path.join(UPLOADS_DIR, 'media', variantFilename);
            expect(fs.existsSync(diskPath)).toBe(true);

            const meta = await sharp(diskPath).metadata();
            expect(meta.format).toBe('webp');
            expect(meta.width).toBe(expectedWidth);
        }
    });

    it('generates only variants smaller than original width for an 800px image', async () => {
        const fixtureBuffer = await sharp({
            create: {
                width: 800,
                height: 600,
                channels: 4,
                background: { r: 20, g: 150, b: 50, alpha: 1 },
            },
        })
            .jpeg()
            .toBuffer();

        const res = await request(app)
            .post('/api/media')
            .set('Authorization', `Bearer ${adminToken}`)
            .attach('image', fixtureBuffer, 'test-medium-800.jpg');

        expect(res.status).toBe(201);
        createdFiles.push(res.body.filename);

        const variants = res.body.variants;
        expect(variants).toBeDefined();
        expect(variants['480']).toBeDefined();
        // 960 and 1600 should not be generated because 800 <= 960
        expect(variants['960']).toBeUndefined();
        expect(variants['1600']).toBeUndefined();

        const v480Filename = path.basename(variants['480']);
        createdFiles.push(v480Filename);
        const diskPath = path.join(UPLOADS_DIR, 'media', v480Filename);
        expect(fs.existsSync(diskPath)).toBe(true);
    });

    it('succeeds with 201 without variants when variant generation fails or sharp throws', async () => {
        resetSharpWarningState();

        // Mock a file object where path is invalid to induce sharp error inside generateUploadVariants
        const mockFile: Express.Multer.File = {
            fieldname: 'image',
            originalname: 'corrupt-file.png',
            encoding: '7bit',
            mimetype: 'image/png',
            size: 1024,
            destination: path.join(UPLOADS_DIR, 'media'),
            filename: 'non-existent-file-xyz.png',
            path: path.join(UPLOADS_DIR, 'media', 'non-existent-file-xyz.png'),
            buffer: Buffer.from([]),
            stream: null as any,
        };

        const variants = await generateUploadVariants(mockFile);
        expect(variants).toBeUndefined();

        // Also test endpoint level with an unparseable dummy PNG buffer
        const corruptBuffer = Buffer.from('not-a-valid-png-stream-at-all');
        const res = await request(app)
            .post('/api/media')
            .set('Authorization', `Bearer ${adminToken}`)
            .attach('image', corruptBuffer, 'corrupt-fixture.png');

        expect(res.status).toBe(201);
        expect(res.body.url).toBeDefined();
        expect(res.body.variants).toBeUndefined();

        if (res.body.filename) {
            createdFiles.push(res.body.filename);
        }
    });

    it('does not attempt variant generation when uploading a video', async () => {
        const dummyVideoBuffer = Buffer.from('fake-mp4-video-data-content-stream');

        const res = await request(app)
            .post('/api/media')
            .set('Authorization', `Bearer ${adminToken}`)
            .attach('media', dummyVideoBuffer, 'sample-test-video.mp4');

        expect(res.status).toBe(201);
        expect(res.body.isVideo).toBe(true);
        expect(res.body.mimetype).toBe('video/mp4');
        expect(res.body.variants).toBeUndefined();

        if (res.body.filename) {
            createdFiles.push(res.body.filename);
        }
    });
});
