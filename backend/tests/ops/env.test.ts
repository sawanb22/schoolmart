import { describe, it, expect } from 'vitest';
import { validateEnv } from '../../src/config/env';

describe('Environment Hardening (T17)', () => {
  const baseValidDevEnv: NodeJS.ProcessEnv = {
    DATABASE_URL: 'postgresql://postgres:secret@localhost:5432/testdb',
    JWT_SECRET: 'short-dev-secret',
    NODE_ENV: 'development',
  };

  const baseValidProdEnv: NodeJS.ProcessEnv = {
    DATABASE_URL: 'postgresql://postgres:secret@localhost:5432/proddb',
    JWT_SECRET: 'production-secret-must-be-at-least-32-characters-long',
    SITE_URL: 'https://campusmart.in',
    FRONTEND_URL: 'https://campusmart.in',
    NODE_ENV: 'production',
  };

  it('validates minimal configuration in non-production environments', () => {
    const env = { ...baseValidDevEnv };
    expect(() => validateEnv(env)).not.toThrow();
  });

  it('automatically defaults DATABASE_URL_UNPOOLED from DATABASE_URL if unset', () => {
    const env: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://user:pass@ep-pooler.aws.neon.tech:5432/db',
      JWT_SECRET: 'dev-secret-1234',
      NODE_ENV: 'development',
    };
    expect(env.DATABASE_URL_UNPOOLED).toBeUndefined();

    validateEnv(env);

    expect(env.DATABASE_URL_UNPOOLED).toBe('postgresql://user:pass@ep-pooler.aws.neon.tech:5432/db');
  });

  it('throws when required DATABASE_URL is missing or empty', () => {
    const env = { ...baseValidDevEnv, DATABASE_URL: '' };
    expect(() => validateEnv(env)).toThrow(/Missing required environment variable: DATABASE_URL/);
  });

  it('throws when required JWT_SECRET is missing or empty', () => {
    const env = { ...baseValidDevEnv, JWT_SECRET: '' };
    expect(() => validateEnv(env)).toThrow(/Missing required environment variable: JWT_SECRET/);
  });

  it('in production, throws when SITE_URL or FRONTEND_URL is missing', () => {
    const envNoSite = { ...baseValidProdEnv, SITE_URL: '' };
    expect(() => validateEnv(envNoSite)).toThrow(/Missing required production environment variable: SITE_URL/);

    const envNoFrontend = { ...baseValidProdEnv, FRONTEND_URL: '' };
    expect(() => validateEnv(envNoFrontend)).toThrow(/Missing required production environment variable: FRONTEND_URL/);
  });

  it('in production, rejects JWT_SECRET shorter than 32 characters', () => {
    const shortSecretEnv = {
      ...baseValidProdEnv,
      JWT_SECRET: 'only-20-chars-here!!',
    };
    expect(() => validateEnv(shortSecretEnv)).toThrow(
      /JWT_SECRET must be at least 32 characters in production/
    );
  });

  it('in production, rejects known placeholder default secrets', () => {
    const insecure1 = {
      ...baseValidProdEnv,
      JWT_SECRET: 'your_super_secret_jwt_key_here',
    };
    expect(() => validateEnv(insecure1)).toThrow(/Insecure default JWT_SECRET cannot be used in production/);

    const insecure2 = {
      ...baseValidProdEnv,
      JWT_SECRET: 'your-jwt-secret',
    };
    expect(() => validateEnv(insecure2)).toThrow(/Insecure default JWT_SECRET cannot be used in production/);
  });

  it('in production, succeeds with valid 32+ char secret and all required fields', () => {
    const env = { ...baseValidProdEnv };
    expect(() => validateEnv(env)).not.toThrow();
  });
});
