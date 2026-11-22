import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { isValidEmail, isValidPhone } from '../lib/validation';
import { syncToSpreadsheet } from '../services/spreadsheet.service';
import { inquiryLimiter } from '../middleware/rate-limit.middleware';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// POST /api/inquiries - Submit Institutional Consultation & Scope Request
router.post('/', inquiryLimiter, verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      institutionName,
      designation,
      location,
      projectType,
      budget,
      timeline,
      message,
      metadata,
    } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      res.status(400).json({ error: 'A valid official email address is required' });
      return;
    }

    if (!phone || typeof phone !== 'string' || !isValidPhone(phone)) {
      res.status(400).json({ error: 'A valid contact phone number is required' });
      return;
    }

    const cleanName = name.trim().slice(0, 120);
    const cleanEmail = email.trim().toLowerCase().slice(0, 120);
    const cleanPhone = phone.trim().slice(0, 30);

    const institution = (typeof institutionName === 'string' ? institutionName.trim().slice(0, 150) : '') || 'Educational Institution';
    const role = (typeof designation === 'string' ? designation.trim().slice(0, 100) : '') || 'Institution Representative';
    const cleanLocation = typeof location === 'string' ? location.trim().slice(0, 120) : 'Not Specified';
    const cleanProjectType = typeof projectType === 'string' ? projectType.trim().slice(0, 100) : 'Not Specified';
    const cleanBudget = typeof budget === 'string' ? budget.trim().slice(0, 100) : 'Under finalization';
    const cleanTimeline = typeof timeline === 'string' ? timeline.trim().slice(0, 100) : 'Next academic session';
    const subject = `Solutions Finder Consultation: ${institution}`;

    const rawMessage = message ? String(message).trim().slice(0, 5000) : 'Turnkey Campus Consultation Request';

    const formattedMessage = [
      `Designation: ${role}`,
      `Institution: ${institution}`,
      `Location: ${cleanLocation}`,
      `Project Type: ${cleanProjectType}`,
      `Budget: ${cleanBudget}`,
      `Timeline: ${cleanTimeline}`,
      `Trace ID: ${metadata?.traceId || 'N/A'}`,
      '',
      rawMessage,
    ].join('\n');

    const enquiry = await prisma.contactEnquiry.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        subject,
        role,
        message: formattedMessage,
      },
    });

    // Asynchronous non-blocking spreadsheet synchronization (with formula injection protection)
    syncToSpreadsheet({
      type: 'Contact Enquiry',
      id: enquiry.id,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      institution,
      subject,
      role,
      message: formattedMessage,
      createdAt: enquiry.createdAt,
    }).catch((sheetErr) => {
      console.error('[Inquiries] Spreadsheet sync error (non-fatal):', sheetErr);
    });

    // Mark telemetry conversion for the specific search log if a valid numeric logId is provided
    const specificLogId = typeof metadata?.searchLogId === 'number'
      ? metadata.searchLogId
      : (typeof metadata?.logId === 'number' ? metadata.logId : null);

    if (specificLogId && specificLogId > 0) {
      prisma.searchQueryLog.update({
        where: { id: specificLogId },
        data: { converted: true },
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Consultation requirement submitted successfully',
      id: enquiry.id,
      traceId: metadata?.traceId || `CM-TRACE-${enquiry.id}`,
    });
  } catch (err: any) {
    console.error('Failed to submit consultation inquiry:', err);
    res.status(500).json({ error: 'Failed to submit requirement. Please try again or contact us directly.' });
  }
});

export default router;
