import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Lỗi hệ thống máy chủ';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || exception.message;
        errorDetails = (res as any).error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled Error: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      success: false,
      message: Array.isArray(message) ? message[0] : message,
      error: errorDetails,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

