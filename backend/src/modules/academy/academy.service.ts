import { Injectable, Logger, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { AdminDatabase } from '../admin/admin.database';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { decideEnrollmentAction, paymentState } from './enrollment-workflow';

@Injectable()
export class AcademyService {
  private readonly logger = new Logger(AcademyService.name);

  constructor(private readonly supabaseService: SupabaseService, private readonly adminDatabase: AdminDatabase) {}

  /**
   * E01: Lấy danh sách khóa học của Học viện (kèm thông tin chuyên mục & giảng viên chính)
   */
  async getCourses(category?: string) {
    try {
      let query = this.supabaseService.adminClient
        .from('courses')
        .select(`
          id,
          title,
          code,
          short_description,
          full_description,
          level,
          total_hours,
          theory_hours,
          practice_hours,
          total_lessons,
          tuition_fee,
          deposit_amount,
          certificate_title,
          image_url,
          is_featured,
          course_categories (
            id,
            name
          ),
          instructors (
            id,
            title,
            experience_years,
            full_name,
            avatar_url
          )
        `)
        .eq('is_active', true)
        .order('is_featured', { ascending: false });

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return {
          success: true,
          data: data.map((c) => this.formatCourse(c)),
        };
      }
    } catch (e: any) {
      this.logger.warn(`Lỗi truy vấn DB courses: ${e.message}`);
    }

    return {
      success: true,
      data: this.getMockCourses(),
    };
  }

  /**
   * E02: Lấy chi tiết khóa học kèm lộ trình bài giảng & đợt khai giảng
   */
  async getCourseDetail(courseId: string) {
    try {
      const { data, error } = await this.supabaseService.adminClient
        .from('courses')
        .select(`
          id,
          title,
          code,
          short_description,
          full_description,
          level,
          total_hours,
          theory_hours,
          practice_hours,
          total_lessons,
          tuition_fee,
          deposit_amount,
          certificate_title,
          image_url,
          course_categories (name),
          instructors (
            id,
            title,
            experience_years,
            full_name,
            avatar_url,
            bio
          ),
          course_chapters (
            id,
            title,
            chapter_order,
            course_lessons (
              id,
              title,
              duration_minutes,
              lesson_order,
              is_free_preview
            )
          ),
          course_batches (
            id,
            batch_code,
            start_date,
            end_date,
            schedule_text,
            max_students,
            enrolled_count,
            branches (name, address)
          )
        `)
        .eq('id', courseId)
        .maybeSingle();

      if (!error && data) {
        return {
          success: true,
          data: this.formatCourse(data),
        };
      }
    } catch (_) {}

    const mock = this.getMockCourses().find((c) => c.id === courseId) || this.getMockCourses()[0];
    return {
      success: true,
      data: mock,
    };
  }

  /**
   * Lấy danh sách lớp học theo đợt khai giảng (course_batches)
   */
  async getCourseBatches(courseId: string) {
    try {
      const { data, error } = await this.supabaseService.adminClient
        .from('course_batches')
        .select(`
          id,
          batch_code,
          start_date,
          end_date,
          schedule_text,
          max_students,
          enrolled_count,
          status,
          branches (name, address)
        `)
        .eq('course_id', courseId)
        .order('start_date', { ascending: true });

      if (!error && data && data.length > 0) {
        return {
          success: true,
          data,
        };
      }
    } catch (_) {}

    return {
      success: true,
      data: [
        {
          id: 'batch-01',
          batch_code: 'K24-SPA-HCM',
          start_date: '2026-10-23',
          end_date: '2026-12-23',
          schedule_text: 'Thứ 6–7–Chủ nhật (13:00 – 17:00)',
          max_students: 15,
          enrolled_count: 8,
          status: 'OPEN_FOR_ENROLLMENT',
          branches: { name: 'Chi nhánh Quận 3', address: '123 Đường Nam Kỳ Khởi Nghĩa, Quận 3' },
        },
      ],
    };
  }

  /**
   * E05/E06: Đăng ký (Ghi danh) khóa học & nhận thông tin thanh toán đặt cọc
   */
  async enrollCourse(userId: string, dto: EnrollCourseDto) {
    const { courseId, batchId, studentName, studentPhone, studentEmail, selectedBranch, selectedShift } = dto;
    const depositAmount = dto.depositAmount || 2000000;
    const enrollmentCode = `MLD-EDU-${Date.now().toString().slice(-6)}`;

    let studentId = (userId && userId !== 'default-user') ? userId : null;

    // 1. Kiểm tra tài khoản người dùng hoặc tìm theo SĐT/Email
      if (studentId) {
        const { data: existingUser } = await this.supabaseService.adminClient
          .from('users')
          .select('id, phone, full_name, email')
          .eq('id', studentId)
          .maybeSingle();

        const updateFields: any = { updated_at: new Date().toISOString() };
        if (!existingUser?.phone && studentPhone) {
          updateFields.phone = studentPhone;
          updateFields.is_phone_verified = true;
        }
        if (!existingUser?.full_name && studentName) {
          updateFields.full_name = studentName;
        }
        if (Object.keys(updateFields).length > 1) {
          await this.supabaseService.adminClient
            .from('users')
            .update(updateFields)
            .eq('id', studentId);
        }
      } else {
        // Tìm theo số điện thoại
        if (studentPhone) {
          const { data: userByPhone } = await this.supabaseService.adminClient
            .from('users')
            .select('id')
            .eq('phone', studentPhone)
            .maybeSingle();
          if (userByPhone?.id) studentId = userByPhone.id;
        }

        // Tìm theo email nếu chưa tìm thấy
        if (!studentId && studentEmail) {
          const { data: userByEmail } = await this.supabaseService.adminClient
            .from('users')
            .select('id')
            .eq('email', studentEmail)
            .maybeSingle();
          if (userByEmail?.id) studentId = userByEmail.id;
        }

        // Nếu vẫn chưa có tài khoản, tạo mới trong bảng users
        if (!studentId) {
          const { data: newUser } = await this.supabaseService.adminClient
            .from('users')
            .insert({
              full_name: studentName || 'Học viên MLD',
              phone: studentPhone || '0900000000',
              email: studentEmail || null,
              role: 'CUSTOMER',
              is_phone_verified: true,
            })
            .select('id')
            .maybeSingle();

          if (newUser?.id) {
            studentId = newUser.id;
          } else {
            throw new InternalServerErrorException('Không thể tạo hồ sơ học viên. Vui lòng thử lại.');
          }
        }
      }

      const { data: duplicateEnrollment } = await this.supabaseService.adminClient
        .from('course_enrollments')
        .select('id, status')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .not('status', 'in', '(GRADUATED,DROPPED)')
        .limit(1)
        .maybeSingle();
      if (duplicateEnrollment) {
        return {
          success: false,
          statusCode: 409,
          message: 'Bạn đã có một hồ sơ đang được xử lý cho khóa học này.',
          data: { id: duplicateEnrollment.id, status: duplicateEnrollment.status },
        };
      }

      // 2. Lấy thông tin học phí khóa học
      let tuitionTotal = 15000000;
      let requiredDeposit = depositAmount;
      try {
        const { data: cData } = await this.supabaseService.adminClient
          .from('courses')
          .select('tuition_fee, deposit_amount')
          .eq('id', courseId)
          .maybeSingle();
        if (cData?.tuition_fee) {
          tuitionTotal = Number(cData.tuition_fee);
        }
        if (cData?.deposit_amount) requiredDeposit = Number(cData.deposit_amount);
      } catch (_) {}

      // Lấy hoặc sinh mã khách hàng chuẩn định danh
      let customerCode = `HV${Date.now().toString().slice(-5)}`;
      try {
        const { data: uData } = await this.supabaseService.adminClient
          .from('users')
          .select('referral_code')
          .eq('id', studentId)
          .maybeSingle();
        if (uData?.referral_code) {
          customerCode = uData.referral_code.startsWith('HV') ? uData.referral_code : `HV-${uData.referral_code}`;
        }
      } catch (_) {}

      // 3. Ghi một hồ sơ duy nhất và chỉ xác nhận sau khi DB trả về ID thật.
      const { data: enrollment, error: enrollmentError } = await this.supabaseService.adminClient
        .from('course_enrollments')
        .insert({
          student_id: studentId,
          course_id: courseId,
          batch_id: batchId || null,
          status: 'PENDING_APPROVAL',
          tuition_total: tuitionTotal,
          amount_paid: 0,
          student_name: studentName,
          student_phone: studentPhone,
          student_email: studentEmail || null,
          selected_branch: selectedBranch || 'Chi nhánh Quận 3 - TP.HCM',
          approval_status: 'PENDING_APPROVAL',
          consultation_status: 'PENDING_CONSULTATION',
          payment_status: 'UNPAID',
          student_status: 'NOT_APPROVED',
          required_deposit: requiredDeposit,
          approval_notes: `Mã KH: ${customerCode}; Mã hồ sơ: ${enrollmentCode}`,
        })
        .select('id, status, approval_status')
        .single();

      if (enrollmentError || !enrollment) {
        this.logger.error(`Lưu enrollment vào DB thất bại: ${enrollmentError?.message || 'Không có bản ghi trả về'}`);
        throw new InternalServerErrorException('Không thể lưu hồ sơ đăng ký. Vui lòng thử lại.');
      }

    return {
      success: true,
      message: 'Đã nhận hồ sơ đăng ký. Nhân viên sẽ kiểm tra và liên hệ về học phí, lịch học.',
      data: {
        id: enrollment.id,
        enrollmentCode,
        customerCode,
        courseId,
        studentName,
        studentPhone,
        studentEmail,
        selectedBranch: selectedBranch || 'Chi nhánh Quận 3',
        selectedShift: selectedShift || 'Thứ 6–7–Chủ nhật · 13:00–17:00',
        depositAmount: requiredDeposit,
        tuitionTotal,
        status: enrollment.status,
        approvalStatus: enrollment.approval_status,
      },
    };
  }

  /** Đối soát chỉ cập nhật tài chính; duyệt nhập học là cổng độc lập. */
  async checkEnrollmentPayment(enrollmentId: string, adminUser: string) {
    try {
      const connection = this.adminDatabase.connection;
      const { rows: [enr] } = await connection.query(
        `SELECT e.id, e.approval_status, e.approval_notes, u.referral_code,
                COALESCE(e.tuition_total, c.tuition_fee, 0) AS tuition_total,
                COALESCE(e.required_deposit, c.deposit_amount, 0) AS required_deposit,
                (SELECT SUM(i.total_amount) FROM invoices i
                 WHERE i.enrollment_id=e.id AND i.payment_status='PAID') AS invoice_amount,
                (SELECT SUM(CASE WHEN t.transaction_type='REFUND' THEN -ABS(t.amount) ELSE t.amount END)
                 FROM tuition_transactions t WHERE t.enrollment_id=e.id AND t.payment_status='PAID') AS transaction_amount
         FROM course_enrollments e
         LEFT JOIN users u ON u.id=e.student_id
         LEFT JOIN courses c ON c.id=e.course_id WHERE e.id=$1`,
        [enrollmentId],
      );
      if (!enr) {
        return {
          success: false,
          statusCode: 404,
          message: 'Không tìm thấy hồ sơ đăng ký',
          data: { isPaid: false, approved: false },
        };
      }

      const notesCode = enr.approval_notes?.match(/Mã KH:\s*([A-Za-z0-9_-]+)/)?.[1];
      const customerCode = (enr.referral_code || notesCode || `HV-${enr.id.slice(-4)}`).toUpperCase();
      // Một khoản POS có thể xuất hiện ở cả hóa đơn và giao dịch học phí.
      const matchedAmount = Math.max(0, Number(enr.invoice_amount), Number(enr.transaction_amount));
      const tuitionFee = Number(enr.tuition_total);
      const requiredDeposit = Number(enr.required_deposit);
      const paymentStatus = paymentState(matchedAmount, tuitionFee);

      if (matchedAmount > 0) {
        await connection.query('SELECT public.fn_reconcile_enrollment_payment($1,$2,$3)', [
          enrollmentId, adminUser, matchedAmount,
        ]);

        return {
          success: true,
          statusCode: 200,
          message: matchedAmount >= requiredDeposit
            ? `Đã đối soát ${matchedAmount.toLocaleString('vi-VN')}đ. Hồ sơ đủ mức cọc và đang chờ admin duyệt.`
            : `Đã đối soát ${matchedAmount.toLocaleString('vi-VN')}đ nhưng chưa đủ mức cọc ${requiredDeposit.toLocaleString('vi-VN')}đ.`,
          data: {
            isPaid: paymentStatus === 'PAID',
            approved: enr.approval_status === 'APPROVED',
            depositSatisfied: matchedAmount >= requiredDeposit,
            paymentStatus,
            amountPaid: matchedAmount,
            tuitionTotal: tuitionFee,
            requiredDeposit,
            customerCode,
          },
        };
      }

      // Chưa nhận được tiền
      return {
        success: true,
        statusCode: 200,
        message: 'Chưa có giao dịch đã thanh toán được ghi nhận cho hồ sơ này.',
        data: {
          isPaid: false,
          approved: false,
          customerCode,
          amountExpected: tuitionFee,
        },
      };
    } catch (err: any) {
      this.logger.error(`Lỗi check payment cho enrollment ${enrollmentId}: ${err.message}`);
      return {
        success: false,
        statusCode: 500,
        message: 'Không thể đối soát học phí. Vui lòng thử lại.',
        data: { isPaid: false, approved: false },
      };
    }
  }

  /**
   * Admin duyệt học viên vào khóa học (thu tiền tại quầy hoặc miễn giảm)
   */
  async approveEnrollment(enrollmentId: string, adminUser: string, amountPaid?: number, notes?: string) {
    try {
      const { data: enr } = await this.supabaseService.adminClient
        .from('course_enrollments')
        .select('id, status, tuition_total, amount_paid, required_deposit, consultation_status, student_id, course_id, courses:course_id(deposit_amount)')
        .eq('id', enrollmentId)
        .maybeSingle();

      if (!enr) return { success: false, message: 'Không tìm thấy hồ sơ đăng ký' };
      if (!adminUser || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminUser)) {
        return { success: false, message: 'Không xác định được admin thực hiện thao tác' };
      }
      const verifiedPaid = Number(enr.amount_paid ?? 0);
      const requiredDeposit = Number(enr.required_deposit || (enr.courses as any)?.deposit_amount || 2000000);
      const tuitionTotal = Number(enr.tuition_total || 0);
      const decision = decideEnrollmentAction('APPROVE_ADMISSION', {
        consultationStatus: enr.consultation_status,
        paymentStatus: paymentState(verifiedPaid, tuitionTotal),
        admissionStatus: 'NOT_APPROVED',
        enrollmentStatus: enr.status || 'PENDING_APPROVAL',
        amountPaid: verifiedPaid,
        tuitionTotal,
        requiredDeposit,
      });
      if (!decision.allowed) return { success: false, message: decision.reasons.join('. ') };

      const { error } = await this.supabaseService.adminClient.rpc('fn_approve_enrollment', {
        p_enrollment_id: enrollmentId,
        p_actor_id: adminUser,
        p_amount_paid: verifiedPaid,
        p_notes: notes || null,
      });
      if (error) return { success: false, message: error.message };

      return {
        success: true,
        message: 'Đã duyệt học viên vào khóa học thành công!',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Lỗi khi duyệt hồ sơ',
      };
    }
  }

  async graduateEnrollment(enrollmentId: string, adminUser: string) {
    if (!adminUser) return { success: false, message: 'Không xác định được admin thực hiện thao tác' };
    const { data, error } = await this.supabaseService.adminClient.rpc('fn_graduate_enrollment', {
      p_enrollment_id: enrollmentId,
      p_actor_id: adminUser,
    });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Học viên đã đủ điều kiện tốt nghiệp và được cấp chứng nhận.', data };
  }

  async assignEnrollmentBatch(enrollmentId: string, batchId: string, adminUser: string, reason?: string) {
    if (!adminUser) return { success: false, message: 'Không xác định được admin thực hiện thao tác' };
    const { data, error } = await this.supabaseService.adminClient.rpc('fn_assign_enrollment_batch', {
      p_enrollment_id: enrollmentId,
      p_batch_id: batchId,
      p_actor_id: adminUser,
      p_transfer_reason: reason?.trim() || null,
    });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Đã xếp lớp và gửi thông báo cho học viên.', data };
  }

  async finalizeEnrollmentConsultation(
    enrollmentId: string,
    adminUser: string,
    finalTuition: number,
    branchName?: string,
    note?: string,
  ) {
    const { data, error } = await this.supabaseService.adminClient.rpc('fn_finalize_enrollment_consultation', {
      p_enrollment_id: enrollmentId,
      p_actor_id: adminUser,
      p_final_tuition: finalTuition,
      p_branch_name: branchName || null,
      p_note: note || null,
    });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Đã chốt tư vấn và gửi yêu cầu đóng cọc cho học viên.', data };
  }

  async createEnrollmentChangeRequest(
    enrollmentId: string,
    actorId: string,
    requestType: string,
    reason: string,
    requestData?: Record<string, unknown>,
  ) {
    const allowed = ['HOLD', 'RESUME', 'TRANSFER', 'WITHDRAWAL', 'REFUND', 'EXTENSION', 'RETEST'];
    if (!allowed.includes(requestType)) return { success: false, message: 'Loại yêu cầu không hợp lệ' };
    if (!reason?.trim()) return { success: false, message: 'Lý do là bắt buộc' };
    const { data, error } = await this.supabaseService.adminClient.from('enrollment_change_requests').insert({
      enrollment_id: enrollmentId,
      request_type: requestType,
      reason: reason.trim(),
      requested_by: actorId,
      request_data: requestData || {},
    }).select('*').single();
    if (error) return { success: false, message: error.code === '23505' ? 'Đã có một yêu cầu cùng loại đang chờ xử lý' : error.message };
    return { success: true, message: 'Đã tạo yêu cầu và đưa vào hàng chờ phê duyệt.', data };
  }

  async resolveEnrollmentChangeRequest(requestId: string, actorId: string, approve: boolean, reviewNote?: string) {
    const { data, error } = await this.supabaseService.adminClient.rpc('fn_resolve_enrollment_change_request', {
      p_request_id: requestId,
      p_actor_id: actorId,
      p_approve: approve,
      p_review_note: reviewNote || null,
    });
    if (error) throw new BadRequestException(error.message || 'Không thể xử lý yêu cầu thay đổi học tập.');
    return { success: true, message: approve ? 'Đã phê duyệt yêu cầu.' : 'Đã từ chối yêu cầu.', data };
  }

  /**
   * E07: Lấy danh sách khóa học tôi đã ghi danh (kết nối course_enrollments)
   */
  async getMyCourses(userId: string) {
    try {
      if (userId && userId !== 'default-user') {
        const { data, error } = await this.supabaseService.adminClient
          .from('course_enrollments')
          .select(`
            id,
            status,
            approval_status,
            student_status,
            approval_notes,
            order_code,
            tuition_total,
            amount_paid,
            completed_lessons_count,
            progress_percent,
            enrolled_at,
            valid_until,
            access_status,
            expired_at,
            extension_months,
            extension_reason,
            courses (
              id,
              title,
              code,
              image_url,
              total_lessons,
              total_hours,
              course_categories (name),
              instructors (full_name, avatar_url)
            ),
            course_batches (
              batch_code,
              start_date,
              end_date,
              schedule_text,
              branches (name)
            )
          `)
          .eq('student_id', userId);

        if (!error && data && data.length > 0) {
          const formatted = data.map((item: any) => {
            const notes = item.approval_notes || '';
            const customerCode = item.order_code || notes.match(/Mã KH:\s*([A-Za-z0-9_-]+)/)?.[1] || `HV-${String(item.id).slice(-4)}`;
            const isApproved = item.approval_status === 'APPROVED' ||
              ['ENROLLED', 'STUDYING', 'COMPLETED', 'GRADUATED'].includes(String(item.student_status).toUpperCase()) ||
              ['ENROLLED', 'STUDYING', 'COMPLETED', 'GRADUATED'].includes(String(item.status).toUpperCase());

            // TÍNH TOÁN HIỆU LỰC 365 NGÀY THEO CHUẨN ĐẶC TẢ GIAI ĐOẠN 2
            const validUntil = item.valid_until || (item.enrolled_at ? new Date(new Date(item.enrolled_at).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString() : null);
            const nowTime = Date.now();
            const validTime = validUntil ? new Date(validUntil).getTime() : 0;
            const isExpired = item.access_status === 'EXPIRED' || (validTime > 0 && nowTime > validTime);
            const daysRemaining = validTime > 0 ? Math.max(0, Math.ceil((validTime - nowTime) / (1000 * 60 * 60 * 24))) : 365;
            const isExpiringSoon = !isExpired && daysRemaining <= 30;
            const computedAccessStatus = isExpired
              ? 'EXPIRED'
              : (item.access_status === 'EXTENDED' ? 'EXTENDED' : (isExpiringSoon ? 'EXPIRING_SOON' : 'ACTIVE'));

            return {
              id: item.id,
              courseId: item.courses?.id,
              title: item.courses?.title,
              batchCode: item.course_batches?.batch_code || 'K24-SPA-HCM',
              branchName: item.course_batches?.branches?.name || 'Chi nhánh Quận 3',
              schedule: item.course_batches?.schedule_text || 'Thứ 6–7–Chủ nhật (13:00 – 17:00)',
              startDate: item.course_batches?.start_date || '23/10/2026',
              endDate: item.course_batches?.end_date || '23/12/2026',
              completedLessons: item.completed_lessons_count || 0,
              totalLessons: item.courses?.total_lessons || 20,
              progressPercentage: item.progress_percent || 0,
              status: item.status,
              approvalStatus: isApproved ? 'APPROVED' : (item.approval_status || item.student_status || 'NOT_APPROVED'),
              studentStatus: item.student_status,
              customerCode,
              validUntil,
              accessStatus: computedAccessStatus,
              isExpired,
              daysRemaining,
              isExpiringSoon,
              extensionMonths: item.extension_months || 0,
              extensionReason: item.extension_reason || null,
              isBlocked: isExpired,
              blockReason: isExpired ? 'Khóa học đã hết hạn hiệu lực 365 ngày. Quyền truy cập bài học và lịch thực hành đã bị khóa.' : null,
              statusText: isExpired
                ? 'Hết hạn 365 ngày (Đã khóa quyền)'
                : (item.status === 'GRADUATED' ? 'Đã hoàn thành' : (isApproved ? 'Đang học' : 'Chờ duyệt')),
              instructorName: item.courses?.instructors?.full_name || 'ThS. Nguyễn Thu Hà',
              instructorAvatar: item.courses?.instructors?.avatar_url || 'assets/images/le_hoai_an.png',
              imageUrl: item.courses?.image_url || 'assets/images/gioithieu_1.png',
            };
          });

          return {
            success: true,
            data: formatted,
          };
        }
      }
    } catch (_) {}

    return {
      success: true,
      data: [],
    };
  }

  /**
   * KIỂM TRA QUYỀN TRUY CẬP BÀI HỌC (CHẶN NẾU HẾT HẠN 365 NGÀY)
   */
  async checkLessonAccess(userId: string, courseId: string, lessonId: string) {
    try {
      // 1. Kiểm tra bài học có cho phép học thử miễn phí (is_free_preview) không
      const { data: lesson } = await this.supabaseService.adminClient
        .from('course_lessons')
        .select('id, title, is_free_preview, video_url, duration_minutes')
        .eq('id', lessonId)
        .maybeSingle();

      if (!lesson) {
        return {
          success: false,
          statusCode: 404,
          allowed: false,
          error: 'LESSON_NOT_FOUND',
          message: 'Không tìm thấy bài học',
        };
      }

      if (lesson.is_free_preview) {
        return {
          success: true,
          statusCode: 200,
          allowed: true,
          isFreePreview: true,
          message: 'Bài học xem trước miễn phí',
          data: lesson,
        };
      }

      // 2. Kiểm tra hồ sơ học viên
      if (!userId || userId === 'default-user') {
        return {
          success: false,
          statusCode: 401,
          allowed: false,
          error: 'UNAUTHORIZED',
          message: 'Vui lòng đăng nhập để xem bài học',
        };
      }

      const { data: enr } = await this.supabaseService.adminClient
        .from('course_enrollments')
        .select('id, status, approval_status, student_status, valid_until, access_status, enrolled_at')
        .eq('student_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();

      if (!enr) {
        return {
          success: false,
          statusCode: 403,
          allowed: false,
          error: 'NOT_ENROLLED',
          message: 'Bạn chưa đăng ký khóa học này.',
        };
      }

      // 3. Kiểm tra duyệt học phí
      const isApproved = enr.approval_status === 'APPROVED' ||
        ['ENROLLED', 'STUDYING', 'COMPLETED', 'GRADUATED'].includes(String(enr.student_status).toUpperCase()) ||
        ['ENROLLED', 'STUDYING', 'COMPLETED', 'GRADUATED'].includes(String(enr.status).toUpperCase());

      if (!isApproved) {
        return {
          success: false,
          statusCode: 403,
          allowed: false,
          error: 'PENDING_APPROVAL',
          message: 'Hồ sơ học viên của bạn đang chờ phê duyệt thanh toán.',
        };
      }

      // 4. KIỂM TRA HẠN 365 NGÀY (CHẶN NẾU HẾT HẠN)
      const validUntil = enr.valid_until || (enr.enrolled_at ? new Date(new Date(enr.enrolled_at).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString() : null);
      const isExpired = enr.access_status === 'EXPIRED' || (validUntil && Date.now() > new Date(validUntil).getTime());

      if (isExpired) {
        return {
          success: false,
          statusCode: 403,
          allowed: false,
          error: 'COURSE_EXPIRED',
          message: 'Khóa học của bạn đã hết hạn hiệu lực 365 ngày. Quyền truy cập bài học và làm bài thi đã bị khóa. Vui lòng liên hệ ban quản trị để gia hạn.',
          validUntil,
        };
      }

      return {
        success: true,
        statusCode: 200,
        allowed: true,
        validUntil,
        data: lesson,
      };
    } catch (err: any) {
      this.logger.error(`Lỗi checkLessonAccess: ${err.message}`);
      return {
        success: false,
        statusCode: 500,
        allowed: false,
        error: 'SERVER_ERROR',
        message: err.message,
      };
    }
  }

  /**
   * ADMIN GIA HẠN THỜI GIAN KHÓA HỌC CHO HỌC VIÊN
   */
  async extendEnrollment(enrollmentId: string, extensionMonths: number, reason: string) {
    try {
      const { data, error } = await this.supabaseService.adminClient.rpc('fn_extend_enrollment', {
        p_enrollment_id: enrollmentId,
        p_extension_months: extensionMonths,
        p_reason: reason,
      });

      if (!error && data && data.length > 0) {
        return {
          success: data[0].success,
          statusCode: data[0].success ? 200 : 400,
          message: data[0].message,
          newValidUntil: data[0].new_valid_until,
        };
      }

      // Fallback update trực tiếp
      const { data: cur } = await this.supabaseService.adminClient
        .from('course_enrollments')
        .select('valid_until, extension_months')
        .eq('id', enrollmentId)
        .maybeSingle();

      if (!cur) {
        return { success: false, statusCode: 404, message: 'Không tìm thấy hồ sơ học viên' };
      }

      const curValid = cur.valid_until ? new Date(cur.valid_until).getTime() : Date.now();
      const baseTime = curValid < Date.now() ? Date.now() : curValid;
      const newValid = new Date(baseTime + extensionMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

      await this.supabaseService.adminClient
        .from('course_enrollments')
        .update({
          valid_until: newValid,
          access_status: 'EXTENDED',
          expired_at: null,
          extension_months: (cur.extension_months || 0) + extensionMonths,
          extension_reason: reason,
        })
        .eq('id', enrollmentId);

      return {
        success: true,
        statusCode: 200,
        message: `Đã gia hạn thành công +${extensionMonths} tháng!`,
        newValidUntil: newValid,
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        message: err.message || 'Lỗi gia hạn học viên',
      };
    }
  }

  /**
   * E11: Lấy lịch học & điểm danh của học viên (kết nối batch_schedules & student_attendance)
   */
  async getMySchedule(userId: string) {
    try {
      if (userId && userId !== 'default-user') {
        const { data, error } = await this.supabaseService.adminClient
          .from('student_attendance')
          .select(`
            id,
            status,
            check_in_time,
            batch_schedules (
              id,
              session_date,
              start_time,
              end_time,
              topic,
              is_practice_lab,
              branch_rooms (name)
            )
          `)
          .limit(10);

        if (!error && data && data.length > 0) {
          const sessions = data.map((item: any) => ({
            id: item.id,
            date: item.batch_schedules?.session_date,
            time: `${item.batch_schedules?.start_time} – ${item.batch_schedules?.end_time}`,
            topic: item.batch_schedules?.topic,
            room: item.batch_schedules?.branch_rooms?.name || 'Phòng thực hành 204',
            status: item.status,
          }));

          return {
            success: true,
            data: {
              currentMonth: 'Tháng 10/2026',
              attendanceRate: 100,
              totalSessions: sessions.length,
              attendedSessions: sessions.filter((s: any) => s.status === 'PRESENT').length,
              upcomingSessions: sessions,
            },
          };
        }
      }
    } catch (_) {}

    return {
      success: true,
      data: {
        currentMonth: 'Tháng 10/2026',
        attendanceRate: 100,
        totalSessions: 24,
        attendedSessions: 6,
        upcomingSessions: [
          {
            id: 'sess-01',
            date: '24/10/2026',
            dayOfWeek: 'Thứ Bảy',
            time: '13:00 – 17:00',
            topic: 'Kỹ thuật massage mặt nâng cơ & bấm huyệt đả thông',
            room: 'Phòng thực hành 204 — Lầu 2',
            instructor: 'ThS. Nguyễn Thu Hà',
            status: 'UPCOMING',
          },
          {
            id: 'sess-02',
            date: '25/10/2026',
            dayOfWeek: 'Chủ Nhật',
            time: '13:00 – 17:00',
            topic: 'Thực hành soi da & phân tích phác đồ trị liệu trên mẫu',
            room: 'Phòng soi da công nghệ cao 102',
            instructor: 'BS. Trần Minh Phương',
            status: 'UPCOMING',
          },
        ],
      },
    };
  }

  /**
   * E12: Lấy kết quả học tập & chứng chỉ (kết nối student_academic_records & student_certificates)
   */
  async getMyResults(userId: string) {
    try {
      if (userId) {
        const { data, error } = await this.supabaseService.adminClient
          .from('student_academic_records')
          .select(`
            id,
            theory_score,
            practical_score,
            attended_sessions,
            total_batch_sessions,
            attendance_rate,
            feedback_theory,
            feedback_practical,
            course_enrollments!inner (
              student_id,
              courses (title)
            )
          `)
          .eq('course_enrollments.student_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          return {
            success: true,
            data: data.map((record: any) => ({
              id: record.id,
              courseTitle: record.course_enrollments?.courses?.title || '',
              theoryScore: record.theory_score,
              practicalScore: record.practical_score,
              overallGpa: ((Number(record.theory_score) + Number(record.practical_score)) / 2).toFixed(1),
              attendanceRate: record.attendance_rate,
              attendedSessions: record.attended_sessions,
              totalBatchSessions: record.total_batch_sessions,
              feedbackTheory: record.feedback_theory,
              feedbackPractical: record.feedback_practical,
            })),
          };
        }
      }
    } catch (error) {
      this.logger.error('Failed to load authenticated student results', error);
      throw new InternalServerErrorException('Không thể tải kết quả học tập');
    }

    return { success: true, data: [] };
  }

  private formatCourse(item: any) {
    return {
      id: item.id,
      title: item.title,
      code: item.code,
      shortDescription: item.short_description || item.shortDescription,
      fullDescription: item.full_description || item.fullDescription,
      level: item.level || 'Cơ bản',
      totalHours: item.total_hours || item.totalHours || 144,
      totalLessons: item.total_lessons || item.totalLessons || 20,
      tuitionFee: Number(item.tuition_fee || item.tuitionFee || 15000000),
      depositAmount: Number(item.deposit_amount || item.depositAmount || 2000000),
      certificateTitle: item.certificate_title || item.certificateTitle || 'Chứng chỉ Quốc gia MLD',
      imageUrl: item.image_url || item.imageUrl || 'assets/images/gioithieu_1.png',
      isFeatured: !!item.is_featured,
      categoryName: item.course_categories?.name || 'Đào tạo Spa',
      instructorName: item.instructors?.full_name || 'ThS. Nguyễn Thu Hà',
      chapters: item.course_chapters || [],
      batches: item.course_batches || [],
    };
  }

  private getMockCourses() {
    return [
      {
        id: '30303030-0001-0001-0001-000000000001',
        title: 'Khóa Đào Tạo Kỹ Thuật Viên Spa Chuyên Nghiệp',
        code: 'SPA-PRO-01',
        shortDescription: 'Cam kết vững tay nghề, thành thạo công nghệ chăm sóc da chuẩn y khoa.',
        fullDescription: 'Khóa học thực chiến với 80% thời lượng thực hành trên mẫu thật. Học viên nắm trọn kỹ năng soi da, phân tích phác đồ điều trị, massage nâng cơ và vận hành máy thẩm mỹ.',
        level: 'Cơ bản',
        totalHours: 144,
        totalLessons: 20,
        tuitionFee: 15000000,
        depositAmount: 2000000,
        certificateTitle: 'Chứng Chỉ Kỹ Thuật Viên Spa Quốc Gia & MLD',
        imageUrl: 'assets/images/gioithieu_1.png',
        isFeatured: true,
        categoryName: 'Chăm sóc da & Trị liệu',
        instructorName: 'ThS. Nguyễn Thu Hà',
      },
      {
        id: '30303030-0001-0001-0001-000000000002',
        title: 'Khóa Nghề Gội Đầu Dưỡng Sinh & Bấm Huyệt Đả Thông',
        code: 'HEAD-SPA-01',
        shortDescription: 'Khóa học cấp tốc giúp bạn tự tin làm việc tại các chuỗi spa dưỡng sinh cao cấp.',
        fullDescription: 'Đào tạo chuyên sâu 14 đường kinh lạc vùng đầu - cổ - vai gáy, kỹ thuật nấu thảo mộc, ấn huyệt thư giãn trị liệu mất ngủ và mệt mỏi.',
        level: 'Cơ bản',
        totalHours: 72,
        totalLessons: 12,
        tuitionFee: 8500000,
        depositAmount: 1500000,
        certificateTitle: 'Chứng Chỉ Chuyên Viên Dưỡng Sinh MLD',
        imageUrl: 'assets/images/gioithieu_2.png',
        isFeatured: true,
        categoryName: 'Dưỡng sinh & Đông y',
        instructorName: 'BS. Trần Minh Phương',
      },
    ];
  }
}
