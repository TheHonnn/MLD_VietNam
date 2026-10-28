import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailRegisterDto } from './dto/email-register.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { AccountLinkDto } from './dto/account-link.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BruteForceGuard } from './guards/brute-force.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Xác thực & Tài khoản (Auth)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản bằng Số điện thoại' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('register/email')
  @UseGuards(BruteForceGuard)
  @ApiOperation({ summary: 'Đăng ký tài khoản bằng Email (Gửi mã OTP về email)' })
  @ApiResponse({ status: 201, description: 'Đã gửi mã OTP xác nhận về Email' })
  async registerEmail(@Body() dto: EmailRegisterDto) {
    return this.authService.registerEmail(dto);
  }

  @Post('verify-email-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực mã OTP Email để kích hoạt tài khoản & nhận Tokens' })
  @ApiResponse({ status: 200, description: 'Kích hoạt thành công, trả về Access Token & Refresh Token' })
  async verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyEmailRegister(dto);
  }

  @Post('resend-otp')
  @UseGuards(BruteForceGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi lại mã OTP xác thực tới Email' })
  @ApiResponse({ status: 200, description: 'Đã gửi lại mã OTP mới' })
  async resendOtp(@Body() body: { email: string; purpose?: string }) {
    return this.authService.resendEmailOtp(body.email, (body.purpose as any) || 'REGISTER');
  }

  @Post('login')
  @UseGuards(BruteForceGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập hợp nhất bằng Số điện thoại hoặc Email + Mật khẩu' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về Access Token (30m) & Refresh Token (30d)' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('login/email')
  @UseGuards(BruteForceGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập trực tiếp bằng Email & Mật khẩu' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  async loginEmail(@Body() dto: EmailLoginDto) {
    return this.authService.loginEmail(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token thông qua Refresh Token (Silent Refresh / Token Rotation)' })
  @ApiResponse({ status: 200, description: 'Cấp mới Access Token thành công' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất tài khoản và thu hồi Refresh Token' })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  async logout(@CurrentUser('id') userId: string, @Body() body?: { refreshToken?: string }) {
    return this.authService.logout(userId, body?.refreshToken);
  }

  @Post('forgot-password')
  @UseGuards(BruteForceGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quên mật khẩu: Gửi mã OTP xác nhận về Email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @UseGuards(BruteForceGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu mới sau khi xác thực OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('link-email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liên kết Email & thiết lập Mật khẩu cho tài khoản đăng ký bằng SĐT' })
  async linkEmail(@CurrentUser('id') userId: string, @Body() dto: AccountLinkDto) {
    return this.authService.linkAccountWithEmail(userId, dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản đang đăng nhập' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('phone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật số điện thoại cho tài khoản (đặc biệt khi đăng nhập bằng Email)' })
  @ApiResponse({ status: 200, description: 'Cập nhật số điện thoại thành công' })
  async updatePhone(@CurrentUser('id') userId: string, @Body() body: { phone: string }) {
    return this.authService.updatePhone(userId, body.phone);
  }


  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đổi mật khẩu tài khoản' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa vĩnh viễn tài khoản (Apple App Store Guideline 5.1.1(v))' })
  @ApiResponse({ status: 200, description: 'Tài khoản đã được xóa vĩnh viễn' })
  async deleteAccount(@CurrentUser('id') userId: string) {
    return this.authService.deleteAccount(userId);
  }
}
