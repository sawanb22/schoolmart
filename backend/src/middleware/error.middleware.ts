import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = typeof err.status === 'number' ? err.status : (err instanceof SyntaxError && 'body' in err ? 400 : 500);
  const requestId = (req as any).id || (res.getHeader('x-request-id') as string) || undefined;

  if (status >= 500) {
    logger.error(
      {
        err: {
          message: err.message,
          stack: err.stack,
          name: err.name,
          code: err.code,
        },
        path: req.path,
        method: req.method,
        requestId,
      },
      'Unhandled internal server error'
    );
  }

  if (process.env.NODE_ENV === 'production') {
    if (status >= 500) {
      return res.status(status).json({
        error: 'internal_error',
        requestId: requestId || null,
      });
    }
    return res.status(status).json({
      error: err.message || 'Bad Request',
      ...(requestId ? { requestId } : {}),
    });
  }

  // Non-production environment: return error details with stack
  return res.status(status).json({
    error: err.message || 'Internal server error',
    ...(requestId ? { requestId } : {}),
    stack: err.stack,
  });
};

export default errorHandler;
