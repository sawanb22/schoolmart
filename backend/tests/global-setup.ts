import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { execSync } from 'child_process';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Ensure backend .env is loaded before running safety checks
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export function stripQueryParams(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return `${u.protocol}//${u.username}:${u.password}@${u.host}${u.pathname}`;
  } catch {
    return (urlStr || '').split('?')[0];
  }
}

export function assertTestDatabaseSafety(env: NodeJS.ProcessEnv = process.env): void {
  const testUrl = env.DATABASE_URL_TEST;
  if (!testUrl || testUrl.trim() === '') {
    throw new Error('Safety guard: DATABASE_URL_TEST is unset or empty.');
  }

  if (env.TEST_DB_CONFIRM !== 'yes-reset-this-db') {
    throw new Error('Safety guard: TEST_DB_CONFIRM must be set to "yes-reset-this-db".');
  }

  const cleanTest = stripQueryParams(testUrl.trim());
  const devUrl = env.DATABASE_URL;
  if (devUrl) {
    const cleanDev = stripQueryParams(devUrl.trim());
    if (cleanTest === cleanDev) {
      throw new Error('Safety guard: DATABASE_URL_TEST matches DATABASE_URL! Refusing to run tests against dev database.');
    }
  }

  const devUnpooledUrl = env.DATABASE_URL_UNPOOLED;
  if (devUnpooledUrl) {
    const cleanDevUnpooled = stripQueryParams(devUnpooledUrl.trim());
    if (cleanTest === cleanDevUnpooled) {
      throw new Error('Safety guard: DATABASE_URL_TEST matches DATABASE_URL_UNPOOLED! Refusing to run tests against dev database.');
    }
  }
}

export const verifyTestDatabaseSafety = assertTestDatabaseSafety;

export default async function setup(): Promise<void> {
  assertTestDatabaseSafety(process.env);

  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_TEST;
  process.env.NODE_ENV = 'test';

  const testEnv = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL_TEST!,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_TEST!,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --dns-result-order=ipv4first`.trim(),
    NODE_ENV: 'test',
  };

  let resetSuccess = false;
  let lastError: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
        cwd: path.resolve(__dirname, '..'),
        env: testEnv,
        stdio: 'inherit',
      });
      resetSuccess = true;
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[global-setup] Prisma migrate reset attempt ${attempt} failed, retrying in 2s...`);
      execSync('node -e "setTimeout(() => {}, 2000)"');
    }
  }

  if (!resetSuccess) {
    throw lastError || new Error('Prisma migrate reset failed after 3 attempts');
  }
}

export { setup };
