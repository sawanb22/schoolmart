import { Router, Request, Response } from 'express';
import { publicCmsCache } from '../services/cms-cache';
import { generateSitemapXml } from '../services/sitemap.service';

const router = Router();

/**
 * GET /sitemap.xml
 * Returns XML sitemap with published pages and structured items.
 * Cached via publicCmsCache() based on CmsState.version.
 */
router.get(['/', '/sitemap.xml'], publicCmsCache(), async (_req: Request, res: Response): Promise<void> => {
  try {
    const xml = await generateSitemapXml();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(xml);
  } catch (error) {
    console.error('[SeoRoutes] Error generating sitemap.xml:', error);
    res.status(500).setHeader('Content-Type', 'text/plain').send('Error generating sitemap');
  }
});

export default router;
