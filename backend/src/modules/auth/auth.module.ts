import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalEmailPasswordStrategy } from './strategies/local-email.strategy';
import { PasswordHasherService } from './services/password-hasher.service';
import { OtpService } from './services/otp.service';
import { EmailService } from './services/email.service';
import { BruteForceGuard } from './guards/brute-force.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'super-secret-jwt-key-medical-healthcare-2026',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '30m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalEmailPasswordStrategy,
    PasswordHasherService,
    OtpService,
    EmailService,
    BruteForceGuard,
  ],
  exports: [AuthService, JwtModule, PasswordHasherService, OtpService, EmailService],
})
export class AuthModule {}
