import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. CORS Configuration
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Global Prefix: /api/v1
  app.setGlobalPrefix('api/v1');

  // 3. Global Pipes & Interceptors & Filters
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
  await app.listen(port);
  logger.log(`🚀 Máy chủ Backend đang chạy tại: http://localhost:${port}/api/v1`);
  logger.log(`📚 Tài liệu Swagger API tại: http://localhost:${port}/api/docs`);
}

bootstrap();
