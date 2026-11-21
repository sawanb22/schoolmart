import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { searchLogLimiter, solutionsSearchLimiter } from '../middleware/rate-limit.middleware';
import { intentScorerService } from '../services/solutions-finder';

const router = Router();

/**
 * Anonymize client IP address to protect privacy.
 * IPv4: Masks last octet to 0 (e.g. 192.168.1.123 -> 192.168.1.0)
 * IPv6: Hashes with SHA-256 and truncates to 12 hex chars.
 */
export function anonymizeIp(ip?: string | null): string | null {
  if (!ip || typeof ip !== 'string') return null;
  const cleanIp = ip.trim();
  if (!cleanIp) return null;

  // Handle standard IPv4 (or IPv4-mapped IPv6 like ::ffff:192.168.1.1)
  const ipv4Match = cleanIp.match(/(?:\d{1,3}\.){3}\d{1,3}/);
  if (ipv4Match) {
    const parts = ipv4Match[0].split('.');
    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
    }
  }

  // IPv6 or localhost
  if (cleanIp === '::1') {
    return '127.0.0.0';
  }

  return crypto.createHash('sha256').update(cleanIp).digest('hex').slice(0, 12);
}

async function handleSolutionsSearch(req: Request, res: Response): Promise<void> {
  try {
    const rawQuery = req.method === 'GET'
      ? (typeof req.query.q === 'string' ? req.query.q : (Array.isArray(req.query.q) ? String(req.query.q[0]) : (typeof req.query.query === 'string' ? req.query.query : '')))
      : (req.body?.query || req.body?.q || req.body?.queryText || '');

    const rawInstitution = req.method === 'GET'
      ? (typeof req.query.institution === 'string' ? req.query.institution : (typeof req.query.institutionType === 'string' ? req.query.institutionType : null))
      : (req.body?.institution || req.body?.institutionType || null);

    const rawCategory = req.method === 'GET'
      ? (typeof req.query.category === 'string' ? req.query.category : (typeof req.query.categorySlug === 'string' ? req.query.categorySlug : null))
      : (req.body?.category || req.body?.categorySlug || null);

    const cleanQuery = String(rawQuery || '').trim().slice(0, 300);
    const cleanInstitution = typeof rawInstitution === 'string' && rawInstitution.trim()
      ? rawInstitution.trim().slice(0, 100)
      : null;
    const cleanCategory = typeof rawCategory === 'string' && rawCategory.trim()
      ? rawCategory.trim().slice(0, 100)
      : null;

    const proposal = await intentScorerService.generateProposal({
      queryText: cleanQuery,
      institutionHint: cleanInstitution,
      categoryHint: cleanCategory,
    });

    // Asynchronous, un-awaited fire-and-forget telemetry logging
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || req.ip;
    const userIp = anonymizeIp(rawIp);

    prisma.searchQueryLog.create({
      data: {
        queryText: (cleanQuery || proposal.requirementSummary.intentSummary).slice(0, 300),
        institutionType: proposal.requirementSummary.institutionId,
        categorySlug: proposal.requirementSummary.categoryId,
        matchedCardSlugs: proposal.curatedSolutions.map(c => c.cardSlug),
        matchedCount: proposal.curatedSolutions.length,
        confidenceScore: proposal.confidenceScore,
        userIp,
        converted: false,
      },
    }).catch(err => {
      console.warn('[SolutionsFinder] Background telemetry log failed:', err.message);
    });

    res.json(proposal);
  } catch (err: any) {
    console.error('Failed to process solutions search proposal:', err);
    res.status(500).json({ error: 'Failed to process solutions search proposal' });
  }
}

// POST & GET /api/solutions-finder/search - Intent Extraction, Scoring & Proposal Generation
router.post('/search', solutionsSearchLimiter, handleSolutionsSearch);
router.get('/search', solutionsSearchLimiter, handleSolutionsSearch);

// POST /api/solutions-finder/log - Record telemetry from user search query
router.post('/log', searchLogLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      queryText,
      institutionType,
      categorySlug,
      matchedCardSlugs,
      matchedCount,
      confidenceScore,
    } = req.body || {};

    if (!queryText || typeof queryText !== 'string' || !queryText.trim()) {
      res.status(400).json({ error: 'queryText is required and cannot be empty' });
      return;
    }

    const trimmedQuery = queryText.trim().slice(0, 300);

    // Sanitize matchedCardSlugs
    const sanitizedSlugs: string[] = Array.isArray(matchedCardSlugs)
      ? matchedCardSlugs
          .filter(s => typeof s === 'string' && s.trim().length > 0)
          .map(s => s.trim())
          .slice(0, 50)
      : [];

    // Compute matched count
    const count = typeof matchedCount === 'number' && matchedCount >= 0
      ? Math.floor(matchedCount)
      : sanitizedSlugs.length;

    // Sanitize confidence score
    let clampedConfidence: number | null = null;
    if (typeof confidenceScore === 'number' && !isNaN(confidenceScore)) {
      clampedConfidence = Math.max(0, Math.min(1, confidenceScore));
    }

    // Extract and anonymize IP
    const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || req.ip;
    const userIp = anonymizeIp(rawIp);

    const log = await prisma.searchQueryLog.create({
      data: {
        queryText: trimmedQuery,
        institutionType: typeof institutionType === 'string' && institutionType.trim() ? institutionType.trim().slice(0, 100) : null,
        categorySlug: typeof categorySlug === 'string' && categorySlug.trim() ? categorySlug.trim().slice(0, 100) : null,
        matchedCardSlugs: sanitizedSlugs,
        matchedCount: count,
        confidenceScore: clampedConfidence,
        userIp,
        converted: false,
      },
      select: {
        id: true,
        queryText: true,
        matchedCount: true,
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, logId: log.id });
  } catch (err) {
    console.error('Failed to log search query:', err);
    res.status(500).json({ error: 'Failed to record search query log' });
  }
});

// PATCH /api/solutions-finder/log/:id/convert - Flag query as converted
router.patch('/log/:id/convert', searchLogLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const logId = parseInt(String(req.params.id), 10);
    if (isNaN(logId) || logId <= 0) {
      res.status(400).json({ error: 'Valid positive integer log id is required' });
      return;
    }

    const existing = await prisma.searchQueryLog.findUnique({
      where: { id: logId },
      select: { id: true, converted: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Search query log not found' });
      return;
    }

    if (!existing.converted) {
      await prisma.searchQueryLog.update({
        where: { id: logId },
        data: { converted: true },
      });
    }

    res.json({ success: true, logId, converted: true });
  } catch (err) {
    console.error('Failed to mark search query converted:', err);
    res.status(500).json({ error: 'Failed to update search conversion' });
  }
});

export default router;
