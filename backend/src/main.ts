import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultProdOrigins = [
    'https://mldvietnam.vn',
    'https://admin.mldvietnam.vn',
    'https://mld-web-admin.vercel.app',
    'https://mld-vietnam.vercel.app',
  ];
  let allowedOrigins: string[] | string = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (isProduction) {
    if (!allowedOrigins.length || (Array.isArray(allowedOrigins) && allowedOrigins.includes('*'))) {
      allowedOrigins = defaultProdOrigins;
    }
  } else {
    if (!allowedOrigins.length || (Array.isArray(allowedOrigins) && allowedOrigins.includes('*'))) {
      allowedOrigins = '*';
    }
  }

  // 1. CORS Configuration
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins === '*' || (Array.isArray(allowedOrigins) && allowedOrigins.includes('*'))) {
        return callback(null, true);
      }
      if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (!isProduction) {
        return callback(null, true);
      }
      callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-MLD-Local-Admin', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
  });

  // 2. Normalize misconfigured URLs (e.g. client having /health in base URL)
  app.use((req: any, res: any, next: any) => {
    if (req.url && req.url.includes('/health/admin/')) {
      req.url = req.url.replace('/health/admin/', '/admin/');
    }
    next();
  });

  // 3. Global Prefix: /api/v1
  app.setGlobalPrefix('api/v1');

  // 4. Global Pipes & Interceptors & Filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // 4. Swagger OpenAPI Documentation (/api/docs)
  const config = new DocumentBuilder()
    .setTitle('Hệ thống Y tế Medical - Healthcare API')
    .setDescription(
      'Tài liệu Swagger API cho ứng dụng di động (Flutter) và Cổng quản trị phòng khám (React Admin)',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Xác thực & Tài khoản (Auth)')
    .addTag('Chuyên khoa y tế (Specialities)')
    .addTag('Danh mục Bác sĩ & Khung giờ (Doctors)')
    .addTag('Đặt lịch & Quản lý Lịch khám (Appointments)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Máy chủ Backend đang chạy tại: http://localhost:${port}/api/v1`);
  logger.log(`📚 Tài liệu Swagger API tại: http://localhost:${port}/api/docs`);
}

bootstrap();
