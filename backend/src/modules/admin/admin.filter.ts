import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
@Catch()
export class AdminExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = error instanceof HttpException ? error.getStatus() : 503;
    const detail = error instanceof HttpException ? error.getResponse() : null;
    const message =
      typeof detail === 'string'
        ? detail
        : detail && typeof detail === 'object'
          ? (detail as any).message
          : 'Không truy cập được backend/database chung. Vui lòng kiểm tra cấu hình máy chủ.';
    response
      .status(status)
      .json({ success: false, statusCode: status, message });
  }
}
