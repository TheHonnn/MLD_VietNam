import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AcademyService } from './academy.service';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Học Viện Đào Tạo Nghề (Group E — Academy)')
@Controller('academy')
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Get('courses')
  @ApiOperation({ summary: 'E01: Lấy danh sách khóa học của Học viện' })
  @ApiQuery({ name: 'category', required: false })
  async getCourses(@Query('category') category?: string) {
    return this.academyService.getCourses(category);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'E02: Lấy chi tiết khóa học kèm danh sách bài giảng & đợt khai giảng' })
  async getCourseDetail(@Param('id') id: string) {
    return this.academyService.getCourseDetail(id);
  }

  @Get('courses/:id/batches')
  @ApiOperation({ summary: 'E05: Lấy danh sách lớp học theo đợt khai giảng (course_batches)' })
  async getCourseBatches(@Param('id') id: string) {
    return this.academyService.getCourseBatches(id);
  }

  @Post('enroll')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'E05/E06: Ghi danh khóa học & sinh mã VietQR đặt cọc' })
  async enrollCourse(
    @CurrentUser('id') userId: string,
    @Body() dto: EnrollCourseDto,
  ) {
    return this.academyService.enrollCourse(userId || 'default-user', dto);
  }

  @Get('my-courses')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'E07: Danh sách khóa học tôi đang tham gia' })
  async getMyCourses(@CurrentUser('id') userId: string) {
    return this.academyService.getMyCourses(userId || 'default-user');
  }

  @Get('schedule')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'E11: Thời khóa biểu & Điểm danh học viên' })
  async getMySchedule(@CurrentUser('id') userId: string) {
    return this.academyService.getMySchedule(userId || 'default-user');
  }

  @Get('results')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'E12: Kết quả học tập & Chứng chỉ tốt nghiệp' })
  async getMyResults(@CurrentUser('id') userId: string) {
    return this.academyService.getMyResults(userId || 'default-user');
  }

  @Get('enrollments/:id/check-payment')
  @ApiOperation({ summary: 'Kiểm tra tiền về theo mã KH & tự động duyệt học viên' })
  async checkEnrollmentPayment(@Param('id') id: string) {
    return this.academyService.checkEnrollmentPayment(id);
  }

  @Get('courses/:courseId/lessons/:lessonId/access')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kiểm tra quyền xem bài học (chặn khi hết hạn 365 ngày)' })
  async checkLessonAccess(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.academyService.checkLessonAccess(userId || 'default-user', courseId, lessonId);
  }

  @Post('enrollments/:id/extend')
  @ApiOperation({ summary: 'Admin gia hạn khóa học (+N tháng) cho học viên' })
  async extendEnrollment(
    @Param('id') id: string,
    @Body() body: { extensionMonths: number; reason: string },
  ) {
    return this.academyService.extendEnrollment(id, body?.extensionMonths || 3, body?.reason || 'Gia hạn theo yêu cầu');
  }
}


