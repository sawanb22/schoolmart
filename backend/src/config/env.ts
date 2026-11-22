import dotenv from 'dotenv';

dotenv.config();

// Default DATABASE_URL_UNPOOLED before Prisma client initializes
if (!process.env.DATABASE_URL_UNPOOLED && process.env.DATABASE_URL) {
  process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
}

/**
 * Validates core environment variables required for SchoolMart / CampusMart operations.
 * Allows passing custom env object for isolated unit testing.
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): void {
  // Ensure unpooled database url is defaulted
  if (!env.DATABASE_URL_UNPOOLED && env.DATABASE_URL) {
    env.DATABASE_URL_UNPOOLED = env.DATABASE_URL;
  }

  const errors: string[] = [];

  const required = ['DATABASE_URL', 'JWT_SECRET'];
  for (const key of required) {
    if (!env[key] || env[key]!.trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  const isProduction = env.NODE_ENV === 'production';

  if (isProduction) {
    const prodRequired = ['SITE_URL', 'FRONTEND_URL'];
    for (const key of prodRequired) {
      if (!env[key] || env[key]!.trim() === '') {
        errors.push(`Missing required production environment variable: ${key}`);
      }
    }

    const jwtSecret = env.JWT_SECRET || '';
    if (
      jwtSecret === 'your_super_secret_jwt_key_here' ||
      jwtSecret === 'your-jwt-secret'
    ) {
      errors.push('Insecure default JWT_SECRET cannot be used in production.');
    } else if (jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production.');
    }
  }

  if (errors.length > 0) {
    throw new Error(`CRITICAL: Environment validation failed:\n  - ${errors.join('\n  - ')}`);
  }
}

export default validateEnv;
