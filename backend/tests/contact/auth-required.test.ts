import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { createTestToken } from '../helpers/auth';
import { withRetry } from '../helpers/db';

const USER_EMAIL = 'form-submitter@campusmart.test';
const UNVERIFIED_EMAIL = 'form-unverified@campusmart.test';

const contactBody = {
  name: 'Form Submitter',
  email: USER_EMAIL,
  phone: '9876543210',
  subject: 'General enquiry',
  message: 'Hello, this is an automated test enquiry.',
};

const quoteBody = {
  name: 'Form Submitter',
  email: USER_EMAIL, // matches the logged-in user, so no OTP is needed
  phone: '9876543210',
  pincode: '560001',
  institution: 'Test School',
  items: 'Desks',
  message: 'Automated quote request.',
};

const inquiryBody = {
  name: 'Form Submitter',
  email: USER_EMAIL,
  phone: '9876543210',
  institutionName: 'Test School',
  message: 'Automated consultation request.',
};

describe('Public form submissions require a verified login', () => {
  let userToken: string;
  let unverifiedToken: string;
  const originalWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  beforeAll(async () => {
    // Never mirror test submissions to a real spreadsheet.
    delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    const user = await withRetry(() =>
      prisma.user.upsert({
        where: { email: USER_EMAIL },
        create: {
          email: USER_EMAIL,
          name: 'Form Submitter',
          passwordHash: 'dummy_hash',
          role: 'user',
          emailVerified: true,
        },
        update: { role: 'user', emailVerified: true },
      })
    );
    userToken = createTestToken({ id: user.id, email: user.email, role: 'user' });

    const unverified = await withRetry(() =>
      prisma.user.upsert({
        where: { email: UNVERIFIED_EMAIL },
        create: {
          email: UNVERIFIED_EMAIL,
          name: 'Unverified',
          passwordHash: 'dummy_hash',
          role: 'user',
          emailVerified: false,
        },
        update: { role: 'user', emailVerified: false },
      })
    );
    unverifiedToken = createTestToken({ id: unverified.id, email: unverified.email, role: 'user' });
  });

  afterAll(async () => {
    if (originalWebhook === undefined) delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    else process.env.GOOGLE_SHEETS_WEBHOOK_URL = originalWebhook;

    await withRetry(() => prisma.contactEnquiry.deleteMany({ where: { email: USER_EMAIL } }));
    await withRetry(() => prisma.quoteRequest.deleteMany({ where: { email: USER_EMAIL } }));
    await withRetry(() =>
      prisma.user.deleteMany({ where: { email: { in: [USER_EMAIL, UNVERIFIED_EMAIL] } } })
    );
  });

  describe('POST /api/contact', () => {
    it('rejects anonymous requests with 401', async () => {
      const res = await request(app).post('/api/contact').send(contactBody);
      expect(res.status).toBe(401);
    });

    it('rejects anonymous multipart resume uploads with 401', async () => {
      const res = await request(app)
        .post('/api/contact')
        .field('name', contactBody.name)
        .field('email', contactBody.email)
        .field('phone', contactBody.phone)
        .field('subject', 'Job Application: Tester')
        .field('role', 'Tester')
        .field('message', contactBody.message)
        .attach('resume', Buffer.from('%PDF-1.4 test'), { filename: 'cv.pdf', contentType: 'application/pdf' });
      expect(res.status).toBe(401);
    });

    it('rejects an invalid token with 401', async () => {
      const res = await request(app)
        .post('/api/contact')
        .set('Authorization', 'Bearer not-a-real-token')
        .send(contactBody);
      expect(res.status).toBe(401);
    });

    it('rejects a user with an unverified email with 403', async () => {
      const res = await request(app)
        .post('/api/contact')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send(contactBody);
      expect(res.status).toBe(403);
    });

    it('accepts a verified user with 201', async () => {
      const res = await request(app)
        .post('/api/contact')
        .set('Authorization', `Bearer ${userToken}`)
        .send(contactBody);
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Enquiry submitted successfully');
      expect(typeof res.body.id).toBe('number');
    });
  });

  describe('POST /api/contact/quote', () => {
    it('rejects anonymous requests with 401', async () => {
      const res = await request(app).post('/api/contact/quote').send(quoteBody);
      expect(res.status).toBe(401);
    });

    it('accepts a verified user with 201', async () => {
      const res = await request(app)
        .post('/api/contact/quote')
        .set('Authorization', `Bearer ${userToken}`)
        .send(quoteBody);
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Quote request submitted successfully');
      expect(typeof res.body.id).toBe('number');
    });
  });

  describe('POST /api/inquiries', () => {
    it('rejects anonymous requests with 401', async () => {
      const res = await request(app).post('/api/inquiries').send(inquiryBody);
      expect(res.status).toBe(401);
    });

    it('accepts a verified user with 201', async () => {
      const res = await request(app)
        .post('/api/inquiries')
        .set('Authorization', `Bearer ${userToken}`)
        .send(inquiryBody);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.id).toBe('number');
    });
  });

  describe('POST /api/contact/send-quote-otp', () => {
    it('is not gated by login (validation error, not 401)', async () => {
      const res = await request(app).post('/api/contact/send-quote-otp').send({});
      expect(res.status).toBe(400);
    });
  });
});
