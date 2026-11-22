import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { UPLOADS_DIR } from '../../src/lib/uploads-dir';
import { seedAdminUser } from '../helpers/auth';

const TEST_FILES = {
  cataloguePdf: 'pdf-protection-catalogue-test.pdf',
  catalogueImage: 'pdf-protection-catalogue-test.jpg',
  documentPdf: 'pdf-protection-document-test.pdf',
  documentImage: 'pdf-protection-document-test.jpg',
};

const pdfBody = Buffer.from('%PDF-1.4\n% SchoolMart PDF protection test\n');
const jpegBody = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

describe('protected uploaded PDFs', () => {
  let verifiedToken: string;

  beforeAll(async () => {
    ({ token: verifiedToken } = await seedAdminUser());

    for (const folder of ['catalogues', 'documents']) {
      fs.mkdirSync(path.join(UPLOADS_DIR, folder), { recursive: true });
    }

    fs.writeFileSync(path.join(UPLOADS_DIR, 'catalogues', TEST_FILES.cataloguePdf), pdfBody);
    fs.writeFileSync(path.join(UPLOADS_DIR, 'catalogues', TEST_FILES.catalogueImage), jpegBody);
    fs.writeFileSync(path.join(UPLOADS_DIR, 'documents', TEST_FILES.documentPdf), pdfBody);
    fs.writeFileSync(path.join(UPLOADS_DIR, 'documents', TEST_FILES.documentImage), jpegBody);
  });

  afterAll(() => {
    for (const [folder, fileName] of [
      ['catalogues', TEST_FILES.cataloguePdf],
      ['catalogues', TEST_FILES.catalogueImage],
      ['documents', TEST_FILES.documentPdf],
      ['documents', TEST_FILES.documentImage],
    ]) {
      fs.rmSync(path.join(UPLOADS_DIR, folder, fileName), { force: true });
    }
  });

  it.each([
    ['/uploads/catalogues/' + TEST_FILES.cataloguePdf],
    ['/uploads/documents/' + TEST_FILES.documentPdf],
  ])('blocks an anonymous direct request for %s', async (url) => {
    const res = await request(app).get(url);

    expect(res.status).toBe(401);
  });

  it.each([
    ['/uploads/catalogues/' + TEST_FILES.cataloguePdf],
    ['/uploads/documents/' + TEST_FILES.documentPdf],
  ])('serves %s when a verified user provides a query token', async (url) => {
    const res = await request(app).get(`${url}?token=${encodeURIComponent(verifiedToken)}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/pdf/);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it.each([
    ['/uploads/catalogues/' + TEST_FILES.cataloguePdf],
    ['/uploads/documents/' + TEST_FILES.documentPdf],
  ])('blocks %s when the query token is invalid', async (url) => {
    const res = await request(app).get(`${url}?token=not-a-real-token`);

    expect(res.status).toBe(401);
  });

  it.each([
    ['/uploads/catalogues/' + TEST_FILES.catalogueImage],
    ['/uploads/documents/' + TEST_FILES.documentImage],
  ])('keeps public images available at %s', async (url) => {
    const res = await request(app).get(url);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^image\/jpeg/);
  });
});
