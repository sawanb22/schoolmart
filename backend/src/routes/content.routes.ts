import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { validateTaxonomyPayload, solutionsIndexService } from '../services/solutions-finder';
import { afterContentWrite } from '../services/page-content/after-content-write';
import { publicCmsCache } from '../services/cms-cache';

const router = Router();

// GET /api/content - get all site content
router.get('/', publicCmsCache(), async (_req: Request, res: Response) => {
    try {
        const content = await prisma.siteContent.findMany();
        const contentMap = Object.fromEntries(content.map((c) => [c.key, c.value]));
        res.json(contentMap);
    } catch (err) {
        console.error('Database connection error on GET /api/content:', err);
        res.status(500).json({ error: 'Database unavailable' });
    }
});

// PUT /api/content - update site content (admin)
router.put('/', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const updates: Record<string, any> = req.body;
        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
            res.status(400).json({ error: 'Invalid content payload: expected an object of key-value pairs' });
            return;
        }

        // Validate solutions_finder_taxonomy if present
        let taxonomyUpdated = false;
        if (updates.solutions_finder_taxonomy !== undefined) {
            const result = validateTaxonomyPayload(updates.solutions_finder_taxonomy);
            if (!result.valid || !result.data) {
                res.status(400).json({ error: `Invalid solutions_finder_taxonomy: ${result.error}` });
                return;
            }
            updates.solutions_finder_taxonomy = JSON.stringify(result.data);
            taxonomyUpdated = true;
        }

        if (updates.home_search_objectives !== undefined) {
            taxonomyUpdated = true;
        }

        const promises = Object.entries(updates).map(([key, value]) => {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            return prisma.siteContent.upsert({
                where: { key },
                update: { value: stringValue },
                create: { key, value: stringValue },
            });
        });

        if (promises.length > 0) {
            await prisma.$transaction(promises);
        }

        await afterContentWrite({ reason: 'content-update', authorId: req.user?.id });

        res.json({ message: 'Content updated successfully' });
    } catch {
        res.status(500).json({ error: 'Failed to update content' });
    }
});

// PUT /api/content/:key - update single key (admin)
router.put('/:key', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const key = String(req.params.key);
        const rawValue = req.body.value !== undefined ? req.body.value : req.body;

        let stringValue: string;
        let taxonomyUpdated = false;

        if (key === 'solutions_finder_taxonomy') {
            const result = validateTaxonomyPayload(rawValue);
            if (!result.valid || !result.data) {
                res.status(400).json({ error: `Invalid solutions_finder_taxonomy: ${result.error}` });
                return;
            }
            stringValue = JSON.stringify(result.data);
            taxonomyUpdated = true;
        } else if (key === 'home_search_objectives') {
            stringValue = typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue);
            taxonomyUpdated = true;
        } else {
            stringValue = typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue);
        }

        const content = await prisma.siteContent.upsert({
            where: { key },
            update: { value: stringValue },
            create: { key, value: stringValue },
        });

        await afterContentWrite({ reason: 'content-key-update', authorId: req.user?.id });

        res.json(content);
    } catch {
        res.status(500).json({ error: 'Failed to update content' });
    }
});

export default router;
