import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

export const logger = pino({
  level: logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.query.token',
      '*.password',
      '*.passwordHash',
      '*.token',
      'password',
      'passwordHash',
      'token',
      'authorization',
      'cookie',
    ],
    censor: '[REDACTED]',
  },
  base: isProduction ? { pid: process.pid } : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
