import jwt from 'jsonwebtoken';
import prisma from '../../src/lib/prisma';

export interface TestUserPayload {
  id?: number;
  email?: string;
  role?: string;
}

export function createTestToken(user: TestUserPayload = {}): string {
  const payload = {
    id: user.id ?? 1,
    email: user.email ?? 'test@schoolmart.in',
    role: user.role ?? 'user',
  };

  const secret = process.env.JWT_SECRET || 'test_jwt_secret_for_vitest_harness_only_not_prod';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function createAdminToken(user: Partial<TestUserPayload> = {}): string {
  return createTestToken({
    id: user.id ?? 999,
    email: user.email ?? 'admin@schoolmart.in',
    role: 'admin',
  });
}

export async function seedAdminUser(): Promise<{ user: any; token: string }> {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@schoolmart.in' },
    create: {
      id: 999,
      email: 'admin@schoolmart.in',
      name: 'Admin Test',
      passwordHash: 'dummy_hash',
      role: 'admin',
      emailVerified: true,
    },
    update: {
      role: 'admin',
      emailVerified: true,
    },
  });
  const token = createAdminToken({ id: admin.id, email: admin.email, role: 'admin' });
  return { user: admin, token };
}

export async function getAdminToken(): Promise<string> {
  const { token } = await seedAdminUser();
  return token;
}
