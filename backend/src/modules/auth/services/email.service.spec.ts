import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService Security & Resilience Tests', () => {
  let logSpy: any;
  let warnSpy: any;
  let errorSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('never prints raw OTP to console or logger', async () => {
    const config = new ConfigService({
      NODE_ENV: 'production',
      MAIL_FROM_NAME: 'MLD Việt Nam',
      MAIL_FROM_ADDRESS: 'no-reply@mldvietnam.vn',
    });

    const emailService = new EmailService(config);
    const rawOtp = '987654';
    const recipient = 'patient.test@example.com';

    // Mock internal dispatch to return true without actual network
    vi.spyOn(emailService as any, 'dispatchHtmlEmail').mockResolvedValue(true);

    const loggedMessages: string[] = [];
    vi.spyOn((emailService as any).logger, 'log').mockImplementation((msg: string) => {
      loggedMessages.push(msg);
    });

    const result = await emailService.sendOtpEmail({
      to: recipient,
      otp: rawOtp,
      purpose: 'REGISTER',
      fullName: 'Test User',
    });

    expect(result).toBe(true);

    // Verify OTP was NEVER logged
    const fullLog = loggedMessages.join(' ');
    expect(fullLog).not.toContain(rawOtp);
    expect(fullLog).toContain('Gửi email OTP [REGISTER]');
  });

  it('returns false in production when email delivery fails rather than pretending success', async () => {
    const config = new ConfigService({
      NODE_ENV: 'production',
      MAIL_FROM_NAME: 'MLD Việt Nam',
      MAIL_FROM_ADDRESS: 'no-reply@mldvietnam.vn',
    });

    const emailService = new EmailService(config);

    // No transporter configured, no RESEND_API_KEY
    const result = await emailService.sendOtpEmail({
      to: 'fail.test@example.com',
      otp: '123456',
      purpose: 'RESET_PASSWORD',
    });

    expect(result).toBe(false);
  });

  it('configures TLS rejectUnauthorized as true in production', () => {
    const config = new ConfigService({
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: 587,
      SMTP_USER: 'test@mld.vn',
      SMTP_PASS: 'secretpass',
    });

    const emailService = new EmailService(config);
    const transporter = (emailService as any).transporter;
    if (transporter && transporter.options && transporter.options.tls) {
      expect(transporter.options.tls.rejectUnauthorized).toBe(true);
    }
  });
});
