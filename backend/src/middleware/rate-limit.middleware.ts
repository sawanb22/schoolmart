import rateLimit from 'express-rate-limit';

/**
 * ============================================================================
 * ARCHITECTURAL NOTE: Rate Limiting Under Phusion Passenger (cPanel Hosting)
 * ============================================================================
 * All rate limiters below use in-memory state stores per Node.js worker process.
 * In a cPanel Phusion Passenger environment configured with N worker processes,
 * incoming requests are load-balanced across all active processes.
 *
 * CONSEQUENCE:
 * An individual client IP may make up to (N * max) requests per window before
 * hitting the limit across all processes if requests distribute uniformly.
 *
 * OPERATIONAL MITIGATION:
 * 1. If strict single-process rate limiting is required, set `PassengerMaxPoolSize 1`
 *    in the application's root `.htaccess` or cPanel Node.js Application Manager.
 * 2. Alternatively, accept the looser effective limit (up to N times configured).
 * 3. In strict compliance with Decision D6 (no Redis, no external caching daemons),
 *    an external Redis store is NOT used.
 * ============================================================================
 */

const isProd = process.env.NODE_ENV === 'production';

// Global rate limiting
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 500 : 5000,
});

// Dedicated rate limiters for authentication and sensitive flows
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 20 : 500,
    message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 10 : 200,
    message: { error: 'Too many OTP requests. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Dedicated rate limiter for solutions finder query logging
export const searchLogLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 120 : 1000,
    message: { error: 'Too many search telemetry requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Dedicated rate limiter for solutions finder search proposals
export const solutionsSearchLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 120 : 1000,
    message: { error: 'Too many search requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Dedicated rate limiter for institutional consultation and inquiry submissions
export const inquiryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 15 : 200,
    message: { error: 'Too many consultation requests from this IP. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
