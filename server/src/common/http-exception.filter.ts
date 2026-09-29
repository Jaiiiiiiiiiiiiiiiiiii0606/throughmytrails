import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { MulterError } from 'multer';

export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
  path: string;
  timestamp: string;
}

/**
 * Every error leaves the API in the same shape:
 * { statusCode, error, message, details?, path, timestamp }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong on our side. Please try again.';
    let details: string[] | undefined;

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Too many requests. Please wait a few minutes and try again.';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const m = (body as { message?: string | string[] }).message;
        if (Array.isArray(m)) {
          details = m;
          message = m[0] ?? exception.message;
        } else if (m) {
          message = m;
        }
      }
    } else if (exception instanceof MulterError) {
      status = exception.code === 'LIMIT_FILE_SIZE' ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST;
      message = exception.code === 'LIMIT_FILE_SIZE' ? 'File is too large.' : exception.message;
    } else if ((exception as { name?: string })?.name === 'CastError') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid identifier.';
    }

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url}`, exception instanceof Error ? exception.stack : String(exception));
    }

    const body: ErrorBody = {
      statusCode: status,
      error: (HttpStatus[status] ?? 'Error').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      message,
      ...(details && details.length > 1 ? { details } : {}),
      path: req.url,
      timestamp: new Date().toISOString(),
    };
    res.status(status).json(body);
  }
}
