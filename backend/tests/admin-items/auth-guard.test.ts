import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../helpers/app';
import prisma from '../../src/lib/prisma';
import { createTestToken } from '../helpers/auth';

describe('Admin Items & Categories Auth Guard (Invariant I8)', () => {
  let userToken: string;
  const pageId = 1;
  const itemId = 1;
  const categoryId = 1;

  beforeAll(async () => {
    // Seed standard non-admin user in database
    await prisma.user.upsert({
      where: { email: 'student@campusmart.in' },
      create: {
        id: 50,
        email: 'student@campusmart.in',
        name: 'Student User',
        passwordHash: 'dummy_hash',
        role: 'user',
        emailVerified: true,
      },
      update: {
        role: 'user',
        emailVerified: true,
      },
    });

    userToken = createTestToken({ id: 50, email: 'student@campusmart.in', role: 'user' });
  });

  const routes: Array<{
    method: 'get' | 'post' | 'patch' | 'delete' | 'put';
    path: string;
    body?: any;
    name: string;
  }> = [
    { method: 'get', path: `/api/admin/pages/${pageId}/items`, name: 'GET items' },
    { method: 'post', path: `/api/admin/pages/${pageId}/items`, body: { collection: 'cards', title: 'T' }, name: 'POST item' },
    { method: 'patch', path: `/api/admin/pages/${pageId}/items/${itemId}`, body: { version: 1 }, name: 'PATCH item' },
    { method: 'delete', path: `/api/admin/pages/${pageId}/items/${itemId}`, name: 'DELETE item' },
    { method: 'put', path: `/api/admin/pages/${pageId}/items/reorder`, body: { orderedIds: [1] }, name: 'PUT items/reorder' },
    { method: 'get', path: `/api/admin/pages/${pageId}/categories`, name: 'GET categories' },
    { method: 'post', path: `/api/admin/pages/${pageId}/categories`, body: { name: 'C' }, name: 'POST category' },
    { method: 'patch', path: `/api/admin/pages/${pageId}/categories/${categoryId}`, body: { name: 'C2' }, name: 'PATCH category' },
    { method: 'delete', path: `/api/admin/pages/${pageId}/categories/${categoryId}`, name: 'DELETE category' },
    { method: 'put', path: `/api/admin/pages/${pageId}/categories/reorder`, body: { orderedIds: [1] }, name: 'PUT categories/reorder' },
  ];

  for (const route of routes) {
    it(`rejects unauthenticated request to ${route.name} (${route.method.toUpperCase()} ${route.path}) with 401`, async () => {
      const req = request(app)[route.method](route.path);
      if (route.body) req.send(route.body);

      const res = await req;
      expect(res.status).toBe(401);
    });

    it(`rejects non-admin authenticated request to ${route.name} (${route.method.toUpperCase()} ${route.path}) with 403`, async () => {
      const req = request(app)[route.method](route.path)
        .set('Authorization', `Bearer ${userToken}`);
      if (route.body) req.send(route.body);

      const res = await req;
      expect(res.status).toBe(403);
    });
  }
});
