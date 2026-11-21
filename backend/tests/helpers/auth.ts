import jwt from 'jsonwebtoken';

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
