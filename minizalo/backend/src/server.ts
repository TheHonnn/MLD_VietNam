import express, { Request, Response } from 'express';
import cors from 'cors';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { BookingStatus, EnrollmentStatus, Prisma, UserRole } from '@prisma/client';
import { database } from './data/database.js';
import { prisma } from './lib/prisma.js';

const app = express();
const PORT = process.env.PORT || 5000;
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.DATABASE_URL || 'mld-local-development-secret';
const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: express.NextFunction) => Promise.resolve(handler(req, res)).catch(next);

const signSession = (userId: string) => {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const sessionUserId = (req: Request) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return parsed.expiresAt > Date.now() && typeof parsed.userId === 'string' ? parsed.userId : null;
  } catch { return null; }
};

const userIdFrom = (req: Request) => sessionUserId(req) || 'usr_001';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const serializeService = (service: any) => ({
  id: service.id,
  title: service.name,
  category: service.category,
  price: Number(service.price),
  originalPrice: service.originalPrice == null ? undefined : Number(service.originalPrice),
  durationMinutes: service.durationMinutes,
  rating: Number(service.rating),
  reviewsCount: service.reviewsCount,
  badge: service.badge ?? undefined,
  image: service.imageUrl ?? '',
  description: service.description ?? '',
  indicatorsCount: service.indicatorsCount,
  preparationNotes: service.preparationNotes,
});

const serializeSpecialist = (specialist: any) => ({
  id: specialist.id,
  name: specialist.name,
  title: specialist.title,
  specialty: specialist.specialty,
  hospital: specialist.workplace ?? specialist.branch?.name ?? '',
  experienceYears: specialist.experienceYears,
  rating: Number(specialist.rating),
  reviewsCount: specialist.reviewsCount,
  avatar: specialist.avatarUrl ?? '',
  consultationFee: Number(specialist.consultationFee),
  bio: specialist.bio ?? '',
});

const serializeVoucher = (item: any) => {
  const voucher = item.voucher ?? item;
  const status = item.usedAt ? 'used' : voucher.expiresAt < new Date() ? 'expired' : 'available';
  return {
    id: voucher.id,
    code: voucher.code,
    title: voucher.title,
    description: voucher.description,
    scope: voucher.scope.toLowerCase(),
    discountType: voucher.discountType.toLowerCase(),
    discountValue: voucher.discountValue,
    maxDiscountAmount: voucher.maxDiscountAmount,
    minOrderValue: voucher.minOrderValue,
    applicableCategories: voucher.applicableCategories,
    startsAt: voucher.startsAt.toISOString(),
    expiryDate: voucher.expiresAt.toISOString(),
    status,
  };
};

const serializeTreatmentPlan = (plan: any) => {
  const sessions = plan.sessions ?? [];
  const completed = sessions.filter((session: any) => session.status === 'COMPLETED').length;
  const scheduled = sessions.filter((session: any) => session.status === 'SCHEDULED').length;
  return {
    id: plan.id,
    name: plan.name,
    image: plan.imageUrl ?? plan.service?.imageUrl ?? '',
    notes: plan.notes ?? '',
    status: plan.status.toLowerCase(),
    totalSessions: plan.totalSessions,
    usedSessions: completed,
    scheduledSessions: scheduled,
    remainingSessions: Math.max(0, plan.totalSessions - completed),
    progressPercent: plan.totalSessions ? Math.round(completed * 100 / plan.totalSessions) : 0,
    purchaseDate: plan.purchasedAt.toISOString(),
    expiryDate: plan.expiresAt.toISOString(),
    service: plan.service ? serializeService(plan.service) : undefined,
    branch: plan.branch,
    user: plan.user ? serializeUser(plan.user) : undefined,
    sessions: sessions.map((session: any) => ({
      id: session.id,
      sessionNumber: session.sessionNumber,
      status: session.status.toLowerCase(),
      scheduledAt: session.scheduledAt?.toISOString() ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
      specialistName: session.specialistName ?? '',
      title: session.title,
      notes: session.notes ?? '',
    })),
  };
};

const serializeInvoice = (invoice: any) => ({
  id: invoice.id,
  code: invoice.code,
  userId: invoice.userId,
  bookingId: invoice.bookingId,
  enrollmentId: invoice.enrollmentId,
  title: invoice.title,
  description: invoice.description ?? '',
  amount: Number(invoice.amount),
  discount: Number(invoice.discount),
  finalAmount: Number(invoice.finalAmount),
  paymentMethod: invoice.paymentMethod,
  status: String(invoice.status).toLowerCase(),
  paidAt: invoice.paidAt?.toISOString() ?? null,
  createdAt: invoice.createdAt.toISOString(),
});

const serializeUser = (user: any) => ({
  id: user.id,
  name: user.name,
  phone: user.phone ?? '',
  email: user.email ?? '',
  role: user.role === UserRole.STUDENT ? 'student' : user.role === UserRole.ADMIN ? 'admin' : 'patient',
  avatar: user.avatarUrl ?? '',
  tier: user.tier,
  points: user.points,
  dob: user.dob ?? '',
  gender: user.gender ?? '',
  address: user.address ?? '',
  preferredBranch: user.preferredBranch ?? '',
  skinType: user.skinType ?? '',
  healthNotes: user.healthNotes ?? '',
  emergencyContactName: user.emergencyContactName ?? '',
  emergencyContactPhone: user.emergencyContactPhone ?? '',
});

const serializeCourse = (course: any) => ({
  id: course.id,
  title: course.title,
  category: course.category,
  price: Number(course.price),
  tuition: `${Number(course.price).toLocaleString('vi-VN')}đ`,
  depositAmount: Number(course.deposit),
  deposit: `${Number(course.deposit).toLocaleString('vi-VN')}đ`,
  duration: course.duration,
  instructor: course.instructor,
  image: course.imageUrl ?? '',
  description: course.description ?? '',
});

const serializeEnrollment = (enrollment: any) => ({
  id: enrollment.id,
  code: enrollment.code,
  courseId: enrollment.courseId,
  courseTitle: enrollment.course.title,
  courseImage: enrollment.course.imageUrl ?? '',
  studentName: enrollment.studentName,
  phone: enrollment.phone,
  email: enrollment.email ?? '',
  totalAmount: Number(enrollment.totalAmount),
  status: String(enrollment.status).toLowerCase(),
  createdAt: enrollment.createdAt.toISOString(),
});

const serializeNotification = (notification: any) => ({
  id: notification.id,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  entityId: notification.entityId,
  isRead: Boolean(notification.readAt),
  createdAt: notification.createdAt.toISOString(),
});

const parseBookingDate = (date: string, timeSlot: string) => {
  const [day, month, year] = date.split('/').map(Number);
  const [hour, minute] = timeSlot.split(' - ')[0].split(':').map(Number);
  if (![day, month, year, hour, minute].every(Number.isFinite)) return null;
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
};

const serializeBooking = (booking: any) => {
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(booking.scheduledAt);
  const start = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(booking.scheduledAt);
  const endDate = new Date(booking.scheduledAt.getTime() + booking.service.durationMinutes * 60_000);
  const end = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(endDate);
  const statusMap: Record<BookingStatus, string> = {
    PENDING: 'pending', CONFIRMED: 'confirmed', COMPLETED: 'completed', CANCELLED: 'cancelled',
  };
  return {
    id: booking.id,
    code: booking.code,
    userId: booking.userId,
    userName: booking.user.name,
    userPhone: booking.user.phone ?? '',
    serviceId: booking.serviceId,
    serviceTitle: booking.service.name,
    doctorId: booking.specialistId ?? '',
    doctorName: booking.specialist?.name ?? 'Trung tâm sắp xếp',
    branchId: booking.branchId,
    branchName: booking.branch.name,
    date,
    timeSlot: `${start} - ${end}`,
    price: Number(booking.service.price),
    discount: Math.max(0, Number(booking.service.price) - Number(booking.totalAmount)),
    finalPrice: Number(booking.totalAmount),
    paymentMethod: 'hospital',
    status: statusMap[booking.status as BookingStatus],
    notes: booking.notes ?? '',
    qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${booking.code}`,
    createdAt: booking.createdAt.toISOString(),
  };
};

const bookingInclude = { user: true, branch: true, service: true, specialist: true } as const;

const findBookingConflict = async (
  specialistId: string,
  scheduledAt: Date,
  durationMinutes: number,
  excludedBookingId?: string,
) => {
  const dayStart = new Date(scheduledAt);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const candidates = await prisma.booking.findMany({
    where: {
      specialistId,
      scheduledAt: { gte: dayStart, lt: dayEnd },
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      ...(excludedBookingId ? { id: { not: excludedBookingId } } : {}),
    },
    include: { service: true },
  });
  const requestedEnd = scheduledAt.getTime() + durationMinutes * 60_000;
  return candidates.find((candidate) => {
    const existingStart = candidate.scheduledAt.getTime();
    const existingEnd = existingStart + candidate.service.durationMinutes * 60_000;
    return scheduledAt.getTime() < existingEnd && requestedEnd > existingStart;
  });
};

// Request logger
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'MLD Vietnam - Cộng Đồng Dẫn Lưu Bạch Huyết & Đào Tạo Nghề API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 1. AUTH & USER ENDPOINTS (GROUP A)
// ==========================================
app.post('/api/auth/zalo', asyncRoute(async (req: Request, res: Response) => {
  const { accessToken, userInfo } = req.body;
  if (!accessToken) return res.status(400).json({ error: 'Thiếu access token Zalo' });
  const graphResponse = await fetch('https://graph.zalo.me/v2.0/me?fields=id,name,picture', {
    headers: { access_token: String(accessToken) },
  });
  const graph: any = await graphResponse.json().catch(() => ({}));
  if (!graphResponse.ok || graph.error || !graph.id) {
    console.warn('[AUTH] Zalo token verification failed', {
      status: graphResponse.status,
      error: graph.error,
      message: graph.message,
    });
    return res.status(401).json({ error: 'Không thể xác minh tài khoản Zalo. Vui lòng đóng Mini App và mở lại.' });
  }
  if (userInfo?.id && String(userInfo.id) !== String(graph.id)) return res.status(401).json({ error: 'Thông tin tài khoản Zalo không khớp' });
  const avatar = userInfo?.avatar || graph.picture?.data?.url || graph.picture || null;
  const name = userInfo?.name || graph.name || 'Khách hàng Zalo';
  const existing = await prisma.user.findUnique({ where: { zaloId: String(graph.id) } });
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { name, avatarUrl: avatar } })
    : await prisma.user.create({ data: { zaloId: String(graph.id), name, avatarUrl: avatar, role: UserRole.CUSTOMER, tier: 'Silver', points: 0 } });
  res.json({ token: signSession(user.id), user: serializeUser(user), isNewUser: !existing });
}));
app.post('/api/auth/send-otp', (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Vui lòng cung cấp số điện thoại' });
  }

  // Demo OTP: 246800
  res.json({
    message: 'Mã xác thực OTP đã được gửi tới số điện thoại của bạn',
    phone,
    otpDemo: '246800',
    expiresInSeconds: 60,
  });
});

app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
  const { phone, otp, role = 'patient' } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Vui lòng nhập số điện thoại và mã OTP' });
  }

  let user = database.users.find((u) => u.phone === phone);
  if (!user) {
    user = {
      id: `usr_${Date.now()}`,
      name: 'Nguyễn Minh Anh',
      phone,
      email: 'minh.anh@example.com',
      role: role as 'patient' | 'student',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      tier: 'Gold',
      points: 2450,
      dob: '15/08/1998',
      gender: 'Nữ',
      address: '123 Đường Mẫu, Quận 3, TP. Hồ Chí Minh',
    };
    database.users.push(user);
  }

  res.json({
    message: 'Xác thực OTP thành công!',
    token: `jwt_token_${user.id}_${Date.now()}`,
    user,
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { phone, role = 'patient' } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Vui lòng cung cấp số điện thoại' });
  }

  let user = database.users.find((u) => u.phone === phone);
  if (!user) {
    user = {
      id: `usr_${Date.now()}`,
      name: role === 'student' ? 'Học Viên MLD' : 'Khách Hàng MLD',
      phone,
      email: `${phone}@mldvietnam.vn`,
      role: role as 'patient' | 'student',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      tier: 'Gold',
      points: 2450,
      dob: '15/08/1998',
      gender: 'Nữ',
      address: '123 Đường Mẫu, Quận 3, TP. Hồ Chí Minh',
    };
    database.users.push(user);
  }

  res.json({
    message: 'Đăng nhập thành công',
    token: `jwt_token_${user.id}_${Date.now()}`,
    user,
  });
});

app.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userIdFrom(req) } });
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error('[API] GET /auth/me failed', error);
    res.status(500).json({ error: 'Không thể tải hồ sơ người dùng' });
  }
});

app.put('/api/auth/profile', async (req: Request, res: Response) => {
  const {
    name, email, address, dob, gender, avatar, preferredBranch, skinType,
    healthNotes, emergencyContactName, emergencyContactPhone,
  } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Họ và tên không được để trống' });
  try {
    const user = await prisma.user.update({
      where: { id: userIdFrom(req) },
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        address: address?.trim() || null,
        dob: dob?.trim() || null,
        gender: gender || null,
        avatarUrl: avatar || null,
        preferredBranch: preferredBranch || null,
        skinType: skinType || null,
        healthNotes: healthNotes || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
      },
    });
    res.json({ message: 'Cập nhật thông tin thành công', user: serializeUser(user) });
  } catch (error) {
    console.error('[API] PUT /auth/profile failed', error);
    res.status(500).json({ error: 'Không thể cập nhật hồ sơ' });
  }
});

// ==========================================
// 2. SERVICES & SPECIALISTS ENDPOINTS (GROUP B)
// ==========================================
app.get('/api/services', async (req: Request, res: Response) => {
  const { category, search } = req.query;
  try {
    const result = await prisma.service.findMany({
      where: {
        isActive: true,
        ...(category && category !== 'all' ? { category: { contains: String(category), mode: 'insensitive' } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: String(search), mode: 'insensitive' } },
                { description: { contains: String(search), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ total: result.length, services: result.map(serializeService) });
  } catch (error) {
    console.error('[API] GET /services failed', error);
    res.status(500).json({ error: 'Không thể tải danh sách dịch vụ' });
  }
});

app.get('/api/services/:id', async (req: Request, res: Response) => {
  try {
    const service = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!service) return res.status(404).json({ error: 'Không tìm thấy dịch vụ' });
    res.json({ service: serializeService(service) });
  } catch (error) {
    console.error('[API] GET /services/:id failed', error);
    res.status(500).json({ error: 'Không thể tải dịch vụ' });
  }
});

app.get('/api/doctors', async (_req: Request, res: Response) => {
  try {
    const specialists = await prisma.specialist.findMany({ where: { isActive: true }, include: { branch: true } });
    res.json({ total: specialists.length, doctors: specialists.map(serializeSpecialist) });
  } catch (error) {
    console.error('[API] GET /doctors failed', error);
    res.status(500).json({ error: 'Không thể tải danh sách chuyên viên' });
  }
});

app.get('/api/doctors/:id', async (req: Request, res: Response) => {
  try {
    const specialist = await prisma.specialist.findUnique({ where: { id: req.params.id }, include: { branch: true } });
    if (!specialist) return res.status(404).json({ error: 'Không tìm thấy kỹ thuật viên/chuyên viên' });
    res.json({ doctor: serializeSpecialist(specialist) });
  } catch (error) {
    console.error('[API] GET /doctors/:id failed', error);
    res.status(500).json({ error: 'Không thể tải chuyên viên' });
  }
});

app.get('/api/branches', async (_req: Request, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    res.json({ branches });
  } catch (error) {
    console.error('[API] GET /branches failed', error);
    res.status(500).json({ error: 'Không thể tải danh sách chi nhánh' });
  }
});

// ==========================================
// 3. BOOKINGS & PAYMENTS (GROUP C)
// ==========================================
app.get('/api/bookings', async (req: Request, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({ where: { userId: userIdFrom(req) }, include: bookingInclude, orderBy: { scheduledAt: 'desc' } });
    res.json({ total: bookings.length, bookings: bookings.map(serializeBooking) });
  } catch (error) {
    console.error('[API] GET /bookings failed', error);
    res.status(500).json({ error: 'Không thể tải lịch hẹn' });
  }
});

app.get('/api/bookings/:id', async (req: Request, res: Response) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { userId: userIdFrom(req), OR: [{ id: req.params.id }, { code: req.params.id }] },
      include: bookingInclude,
    });
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn' });
    res.json({ booking: serializeBooking(booking) });
  } catch (error) {
    console.error('[API] GET /bookings/:id failed', error);
    res.status(500).json({ error: 'Không thể tải lịch hẹn' });
  }
});

app.post('/api/bookings', async (req: Request, res: Response) => {
  const {
    serviceId,
    doctorId,
    branchId,
    date,
    timeSlot,
    userName,
    userPhone,
    notes = '',
    voucherCode,
  } = req.body;
  const scheduledAt = parseBookingDate(date, timeSlot);
  if (!serviceId || !branchId || !date || !timeSlot || !scheduledAt) {
    return res.status(400).json({ error: 'Thông tin đặt lịch chưa đầy đủ hoặc không hợp lệ' });
  }

  try {
    const [service, branch, requestedSpecialist] = await Promise.all([
      prisma.service.findUnique({ where: { id: serviceId } }),
      prisma.branch.findUnique({ where: { id: branchId } }),
      doctorId ? prisma.specialist.findUnique({ where: { id: doctorId } }) : Promise.resolve(null),
    ]);
    if (!service || !branch) return res.status(404).json({ error: 'Dịch vụ hoặc chi nhánh không tồn tại' });
    if (doctorId && !requestedSpecialist) return res.status(404).json({ error: 'Chuyên viên không tồn tại' });
    if (scheduledAt.getTime() <= Date.now()) return res.status(400).json({ error: 'Vui lòng chọn thời gian trong tương lai' });
    if (requestedSpecialist && requestedSpecialist.branchId !== branchId) {
      return res.status(409).json({ error: 'Chuyên viên không làm việc tại chi nhánh đã chọn' });
    }

    let appliedUserVoucher: any = null;
    let finalAmount = Number(service.price);
    if (voucherCode) {
      appliedUserVoucher = await prisma.userVoucher.findFirst({
        where: { userId: userIdFrom(req), usedAt: null, voucher: { code: String(voucherCode).trim().toUpperCase() } },
        include: { voucher: true },
      });
      const voucher = appliedUserVoucher?.voucher;
      const now = new Date();
      if (!voucher || !voucher.isActive || voucher.startsAt > now || voucher.expiresAt < now) {
        return res.status(400).json({ error: 'Mã ưu đãi không khả dụng hoặc đã hết hạn' });
      }
      if (voucher.scope !== 'ALL' && voucher.scope !== 'SERVICE') {
        return res.status(400).json({ error: 'Mã này chỉ áp dụng cho khóa học' });
      }
      if (voucher.applicableCategories.length && !voucher.applicableCategories.includes(service.category)) {
        return res.status(400).json({ error: `Mã chỉ áp dụng cho: ${voucher.applicableCategories.join(', ')}` });
      }
      if (finalAmount < voucher.minOrderValue) {
        return res.status(400).json({ error: `Giá trị dịch vụ tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')} đ` });
      }
      const calculated = voucher.discountType === 'PERCENT'
        ? Math.floor(finalAmount * voucher.discountValue / 100)
        : voucher.discountValue;
      finalAmount -= Math.min(calculated, voucher.maxDiscountAmount ?? calculated, finalAmount);
    }

    let assignedSpecialist = requestedSpecialist;
    if (!assignedSpecialist) {
      const available = await prisma.specialist.findMany({
        where: { branchId, isActive: true, services: { some: { serviceId } } },
      });
      for (const candidate of available) {
        const conflict = await findBookingConflict(candidate.id, scheduledAt, service.durationMinutes);
        if (!conflict) {
          assignedSpecialist = candidate;
          break;
        }
      }
      if (!assignedSpecialist) {
        return res.status(409).json({ error: 'Tất cả chuyên viên đã kín lịch ở khung giờ này. Vui lòng chọn giờ khác.' });
      }
    }

    const conflict = await findBookingConflict(assignedSpecialist.id, scheduledAt, service.durationMinutes);
    if (conflict) {
      return res.status(409).json({
        error: `${assignedSpecialist.name} đã có lịch trùng thời gian này. Vui lòng chọn chuyên viên hoặc giờ khác.`,
        code: 'BOOKING_CONFLICT',
      });
    }

    const user = await prisma.user.update({
      where: { id: userIdFrom(req) },
      data: {
        ...(userName ? { name: userName } : {}),
        ...(userPhone ? { phone: String(userPhone).replace(/\s/g, '') } : {}),
      },
    });
    const code = `SPA-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const created = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          code,
          userId: user.id,
          branchId,
          serviceId,
          specialistId: assignedSpecialist!.id,
          scheduledAt,
          status: BookingStatus.CONFIRMED,
          notes,
          totalAmount: finalAmount,
        },
        include: bookingInclude,
      });
      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'booking',
          entityId: booking.id,
          title: 'Đặt lịch thành công',
          message: `${service.name} lúc ${timeSlot}, ngày ${date} tại ${branch.name}.`,
        },
      });
      if (appliedUserVoucher) {
        await tx.userVoucher.update({
          where: { userId_voucherId: { userId: user.id, voucherId: appliedUserVoucher.voucherId } },
          data: { usedAt: new Date() },
        });
        await tx.voucher.update({ where: { id: appliedUserVoucher.voucherId }, data: { usageCount: { increment: 1 } } });
      }
      return booking;
    });
    res.status(201).json({ message: 'Đặt lịch thành công', booking: serializeBooking(created) });
  } catch (error) {
    console.error('[API] POST /bookings failed', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Khung giờ này vừa được người khác đặt. Vui lòng chọn giờ khác.', code: 'BOOKING_CONFLICT' });
    }
    res.status(500).json({ error: 'Không thể tạo lịch hẹn' });
  }
});

app.patch('/api/bookings/:id/reschedule', async (req: Request, res: Response) => {
  const { date, timeSlot } = req.body;
  const scheduledAt = parseBookingDate(date, timeSlot);
  if (!scheduledAt) return res.status(400).json({ error: 'Ngày hoặc giờ hẹn không hợp lệ' });
  try {
    const current = await prisma.booking.findFirst({ where: { id: req.params.id, userId: userIdFrom(req) }, include: { service: true } });
    if (!current) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn' });
    if (current.status === BookingStatus.CANCELLED || current.status === BookingStatus.COMPLETED) {
      return res.status(409).json({ error: 'Không thể đổi lịch đã hủy hoặc đã hoàn thành' });
    }
    if (scheduledAt.getTime() <= Date.now()) return res.status(400).json({ error: 'Vui lòng chọn thời gian trong tương lai' });
    const conflict = current.specialistId
      ? await findBookingConflict(current.specialistId, scheduledAt, current.service.durationMinutes, current.id)
      : null;
    if (conflict) return res.status(409).json({ error: 'Chuyên viên đã có lịch trùng thời gian mới. Vui lòng chọn giờ khác.', code: 'BOOKING_CONFLICT' });
    const updated = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: { id: current.id }, data: { scheduledAt }, include: bookingInclude,
      });
      await tx.notification.create({
        data: { userId: current.userId, type: 'booking', entityId: current.id, title: 'Lịch hẹn đã được thay đổi', message: `Lịch mới: ${timeSlot}, ngày ${date}.` },
      });
      return booking;
    });
    res.json({ message: 'Đổi lịch thành công', booking: serializeBooking(updated) });
  } catch (error) {
    console.error('[API] PATCH /bookings/:id/reschedule failed', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Khung giờ mới vừa được người khác đặt. Vui lòng chọn giờ khác.', code: 'BOOKING_CONFLICT' });
    }
    res.status(500).json({ error: 'Không thể đổi lịch hẹn' });
  }
});

app.patch('/api/bookings/:id/cancel', async (req: Request, res: Response) => {
  try {
    const current = await prisma.booking.findFirst({ where: { id: req.params.id, userId: userIdFrom(req) } });
    if (!current) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn' });
    if (current.status === BookingStatus.COMPLETED) return res.status(409).json({ error: 'Không thể hủy lịch đã hoàn thành' });
    if (current.status === BookingStatus.CANCELLED) return res.status(409).json({ error: 'Lịch hẹn này đã được hủy trước đó' });
    const updated = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: { id: current.id },
        data: { status: BookingStatus.CANCELLED, notes: req.body.reason || current.notes },
        include: bookingInclude,
      });
      await tx.notification.create({
        data: { userId: current.userId, type: 'booking', entityId: current.id, title: 'Lịch hẹn đã hủy', message: `Mã lịch ${current.code} đã được hủy theo yêu cầu của bạn.` },
      });
      return booking;
    });
    res.json({ message: 'Hủy lịch thành công', booking: serializeBooking(updated) });
  } catch (error) {
    console.error('[API] PATCH /bookings/:id/cancel failed', error);
    res.status(500).json({ error: 'Không thể hủy lịch hẹn' });
  }
});

// ==========================================
// 4. ACADEMY & COURSES ENDPOINTS (GROUP E)
// ==========================================
app.get('/api/courses', async (_req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    res.json({ total: courses.length, courses: courses.map(serializeCourse) });
  } catch (error) {
    console.error('[API] GET /courses failed', error);
    res.status(500).json({ error: 'Không thể tải danh sách khóa học' });
  }
});

app.get('/api/courses/:id', async (req: Request, res: Response) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) return res.status(404).json({ error: 'Không tìm thấy khóa học' });
    res.json({ course: serializeCourse(course) });
  } catch (error) {
    console.error('[API] GET /courses/:id failed', error);
    res.status(500).json({ error: 'Không thể tải khóa học' });
  }
});

app.get('/api/course-enrollments', async (req: Request, res: Response) => {
  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId: userIdFrom(req) }, include: { course: true }, orderBy: { createdAt: 'desc' },
    });
    res.json({ enrollments: enrollments.map(serializeEnrollment) });
  } catch (error) {
    console.error('[API] GET /course-enrollments failed', error);
    res.status(500).json({ error: 'Không thể tải khóa học đã đăng ký' });
  }
});

app.post('/api/course-enrollments', async (req: Request, res: Response) => {
  const { courseId, studentName, phone, email, voucherCode } = req.body;
  if (!courseId || !studentName?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ họ tên và số điện thoại học viên' });
  }
  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || !course.isActive) return res.status(404).json({ error: 'Khóa học không tồn tại hoặc đã ngừng tuyển sinh' });
    const existing = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: userIdFrom(req), courseId } }, include: { course: true },
    });
    if (existing && existing.status !== EnrollmentStatus.CANCELLED) {
      return res.status(409).json({ error: 'Bạn đã đăng ký khóa học này', enrollment: serializeEnrollment(existing) });
    }
    let appliedUserVoucher: any = null;
    let finalAmount = Number(course.price);
    if (voucherCode) {
      appliedUserVoucher = await prisma.userVoucher.findFirst({
        where: { userId: userIdFrom(req), usedAt: null, voucher: { code: String(voucherCode).trim().toUpperCase() } },
        include: { voucher: true },
      });
      const voucher = appliedUserVoucher?.voucher;
      const now = new Date();
      if (!voucher || !voucher.isActive || voucher.startsAt > now || voucher.expiresAt < now) {
        return res.status(400).json({ error: 'Mã ưu đãi không khả dụng hoặc đã hết hạn' });
      }
      if (voucher.scope !== 'ALL' && voucher.scope !== 'COURSE') {
        return res.status(400).json({ error: 'Mã này chỉ áp dụng cho dịch vụ chăm sóc' });
      }
      if (finalAmount < voucher.minOrderValue) {
        return res.status(400).json({ error: `Học phí tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')} đ` });
      }
      const calculated = voucher.discountType === 'PERCENT' ? Math.floor(finalAmount * voucher.discountValue / 100) : voucher.discountValue;
      finalAmount -= Math.min(calculated, voucher.maxDiscountAmount ?? calculated, finalAmount);
    }
    const code = `MLD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const enrollment = await prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.courseEnrollment.update({
            where: { id: existing.id },
            data: { code, studentName: studentName.trim(), phone: phone.trim(), email: email?.trim() || null, status: EnrollmentStatus.PENDING, totalAmount: finalAmount },
            include: { course: true },
          })
        : await tx.courseEnrollment.create({
            data: { code, userId: userIdFrom(req), courseId, studentName: studentName.trim(), phone: phone.trim(), email: email?.trim() || null, totalAmount: finalAmount },
            include: { course: true },
          });
      await tx.notification.create({
        data: { userId: userIdFrom(req), type: 'course', entityId: saved.id, title: 'Đăng ký khóa học thành công', message: `${course.title} đã được giữ chỗ. Bộ phận đào tạo sẽ liên hệ xác nhận học phí.` },
      });
      if (appliedUserVoucher) {
        await tx.userVoucher.update({
          where: { userId_voucherId: { userId: userIdFrom(req), voucherId: appliedUserVoucher.voucherId } },
          data: { usedAt: new Date() },
        });
        await tx.voucher.update({ where: { id: appliedUserVoucher.voucherId }, data: { usageCount: { increment: 1 } } });
      }
      return saved;
    });
    res.status(201).json({ message: 'Đăng ký khóa học thành công', enrollment: serializeEnrollment(enrollment) });
  } catch (error) {
    console.error('[API] POST /course-enrollments failed', error);
    res.status(500).json({ error: 'Không thể đăng ký khóa học' });
  }
});

app.post('/api/courses/:id/quiz/submit', (req: Request, res: Response) => {
  const { answers } = req.body;
  const course = database.courses.find((c) => c.id === req.params.id);

  if (!course || !course.quiz) {
    return res.status(404).json({ error: 'Khóa học không có bài kiểm tra trắc nghiệm' });
  }

  let correctCount = 0;
  course.quiz.questions.forEach((q) => {
    if (answers && answers[q.id] === q.correctAnswerIndex) {
      correctCount++;
    }
  });

  const total = course.quiz.questions.length;
  const scorePercent = Math.round((correctCount / total) * 100);
  const isPassed = scorePercent >= course.quiz.passingScore;

  res.json({
    score: scorePercent,
    correctCount,
    totalQuestions: total,
    isPassed,
    certificateCode: isPassed ? `CERT-${course.id.toUpperCase()}-${Date.now().toString().slice(-6)}` : null,
    message: isPassed
      ? `Chúc mừng bạn đã xuất sắc vượt qua bài thi với ${scorePercent}%! Chứng chỉ MLD Academy đã được cấp.`
      : `Bạn đạt ${scorePercent}%. Cần đạt tối thiểu ${course.quiz.passingScore}% để nhận chứng chỉ. Vui lòng ôn tập và thi lại.`,
  });
});

// ==========================================
// 5. MEDICAL RECORDS & EMR (GROUP D)
// ==========================================
app.get('/api/records', (req: Request, res: Response) => {
  res.json({ total: database.medicalRecords.length, records: database.medicalRecords });
});

app.get('/api/records/:id', (req: Request, res: Response) => {
  const record = database.medicalRecords.find((r) => r.id === req.params.id || r.recordCode === req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Không tìm thấy hồ sơ trị liệu' });
  }
  res.json({ record });
});

// ==========================================
// 6. MEMBERSHIP & VOUCHERS (GROUP F)
// ==========================================
app.get('/api/membership', async (req: Request, res: Response) => {
  try {
    const [user, userVouchers, upcomingBookings, activeEnrollments, treatmentPlans] = await Promise.all([
      prisma.user.findUnique({ where: { id: userIdFrom(req) } }),
      prisma.userVoucher.findMany({
        where: { userId: userIdFrom(req), voucher: { isActive: true } },
        include: { voucher: true },
        orderBy: { claimedAt: 'desc' },
      }),
      prisma.booking.count({ where: { userId: userIdFrom(req), status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] }, scheduledAt: { gte: new Date() } } }),
      prisma.courseEnrollment.count({ where: { userId: userIdFrom(req), status: { in: [EnrollmentStatus.PENDING, EnrollmentStatus.CONFIRMED] } } }),
      prisma.treatmentPlan.findMany({ where: { userId: userIdFrom(req), status: 'ACTIVE' }, include: { sessions: true } }),
    ]);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy hội viên' });
    const remainingTreatmentSessions = treatmentPlans.reduce((sum, plan) => {
      const completed = plan.sessions.filter((session) => session.status === 'COMPLETED').length;
      return sum + Math.max(0, plan.totalSessions - completed);
    }, 0);
    res.json({
      user: { ...serializeUser(user), nextTierPoints: 5000 },
      vouchers: userVouchers.map(serializeVoucher),
      summary: { upcomingBookings, remainingTreatmentSessions, activeCourses: activeEnrollments },
    });
  } catch (error) {
    console.error('[API] GET /membership failed', error);
    res.status(500).json({ error: 'Không thể tải thông tin hội viên' });
  }
});

app.get('/api/treatment-plans', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.treatmentPlan.findMany({
      where: { userId: userIdFrom(req) },
      include: { service: true, branch: true, sessions: { orderBy: { sessionNumber: 'asc' } } },
      orderBy: { purchasedAt: 'desc' },
    });
    res.json({ treatmentPlans: plans.map(serializeTreatmentPlan) });
  } catch (error) {
    console.error('[API] GET /treatment-plans failed', error);
    res.status(500).json({ error: 'Không thể tải gói liệu trình' });
  }
});

app.post('/api/admin/treatment-plans', asyncRoute(async (req: Request, res: Response) => {
  const { userId = 'usr_001', serviceId, branchId, name, totalSessions, expiresAt, imageUrl, notes } = req.body;
  if (!serviceId || !branchId || !name?.trim() || !Number.isInteger(Number(totalSessions)) || Number(totalSessions) < 1 || !expiresAt) {
    return res.status(400).json({ error: 'Thông tin liệu trình chưa đầy đủ hoặc không hợp lệ' });
  }
  const plan = await prisma.treatmentPlan.create({
    data: { userId, serviceId, branchId, name: name.trim(), totalSessions: Number(totalSessions), expiresAt: new Date(expiresAt), imageUrl: imageUrl || null, notes: notes || null },
    include: { user: true, service: true, branch: true, sessions: true },
  });
  await prisma.notification.create({ data: { userId, type: 'treatment', entityId: plan.id, title: 'Đã thêm liệu trình mới', message: `${plan.name} gồm ${plan.totalSessions} buổi.` } });
  res.status(201).json({ treatmentPlan: serializeTreatmentPlan(plan) });
}));

app.patch('/api/admin/treatment-plans/:id', asyncRoute(async (req: Request, res: Response) => {
  const { name, totalSessions, expiresAt, status, imageUrl, notes, branchId, serviceId } = req.body;
  const plan = await prisma.treatmentPlan.update({
    where: { id: req.params.id },
    data: {
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(totalSessions !== undefined ? { totalSessions: Number(totalSessions) } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
      ...(status ? { status: String(status).toUpperCase() as any } : {}),
      ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
      ...(branchId ? { branchId } : {}),
      ...(serviceId ? { serviceId } : {}),
    },
    include: { user: true, service: true, branch: true, sessions: { orderBy: { sessionNumber: 'asc' } } },
  });
  res.json({ treatmentPlan: serializeTreatmentPlan(plan) });
}));

app.post('/api/admin/treatment-plans/:id/sessions', asyncRoute(async (req: Request, res: Response) => {
  const plan = await prisma.treatmentPlan.findUnique({ where: { id: req.params.id }, include: { sessions: true } });
  if (!plan) return res.status(404).json({ error: 'Không tìm thấy liệu trình' });
  const sessionNumber = Number(req.body.sessionNumber || Math.max(0, ...plan.sessions.map((item) => item.sessionNumber)) + 1);
  if (sessionNumber > plan.totalSessions) return res.status(400).json({ error: 'Số buổi vượt quá tổng số buổi của liệu trình' });
  await prisma.treatmentSession.create({ data: { planId: plan.id, sessionNumber, title: req.body.title?.trim() || `Buổi ${sessionNumber}`, scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null, specialistName: req.body.specialistName || null, notes: req.body.notes || null } });
  const updated = await prisma.treatmentPlan.findUniqueOrThrow({ where: { id: plan.id }, include: { user: true, service: true, branch: true, sessions: { orderBy: { sessionNumber: 'asc' } } } });
  res.status(201).json({ treatmentPlan: serializeTreatmentPlan(updated) });
}));

app.patch('/api/admin/treatment-sessions/:id/complete', async (req: Request, res: Response) => {
  try {
    const session = await prisma.treatmentSession.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', completedAt: new Date(), notes: req.body.notes || undefined },
      include: { plan: { include: { service: true, branch: true, sessions: { orderBy: { sessionNumber: 'asc' } } } } },
    });
    await prisma.notification.create({
      data: { userId: session.plan.userId, type: 'treatment', entityId: session.planId, title: 'Cập nhật liệu trình', message: `Buổi ${session.sessionNumber} đã hoàn thành.` },
    });
    res.json({ treatmentPlan: serializeTreatmentPlan(session.plan) });
  } catch (error) {
    console.error('[API] complete treatment session failed', error);
    res.status(404).json({ error: 'Không tìm thấy buổi liệu trình' });
  }
});

app.patch('/api/admin/treatment-sessions/:id', asyncRoute(async (req: Request, res: Response) => {
  const { title, status, scheduledAt, specialistName, notes } = req.body;
  const session = await prisma.treatmentSession.update({
    where: { id: req.params.id },
    data: { ...(title ? { title } : {}), ...(status ? { status: String(status).toUpperCase() as any } : {}), ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}), ...(specialistName !== undefined ? { specialistName: specialistName || null } : {}), ...(notes !== undefined ? { notes: notes || null } : {}) },
    include: { plan: { include: { user: true, service: true, branch: true, sessions: { orderBy: { sessionNumber: 'asc' } } } } },
  });
  res.json({ treatmentPlan: serializeTreatmentPlan(session.plan) });
}));

app.get('/api/transactions', asyncRoute(async (req: Request, res: Response) => {
  const [invoices, pointTransactions] = await Promise.all([
    prisma.invoice.findMany({ where: { userId: userIdFrom(req) }, orderBy: { createdAt: 'desc' } }),
    prisma.pointTransaction.findMany({ where: { userId: userIdFrom(req) }, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json({ invoices: invoices.map(serializeInvoice), pointTransactions, totalSpent: invoices.filter((item) => item.status === 'PAID').reduce((sum, item) => sum + Number(item.finalAmount), 0) });
}));

app.get('/api/notifications', async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({ where: { userId: userIdFrom(req) }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ unreadCount: notifications.filter((item) => !item.readAt).length, notifications: notifications.map(serializeNotification) });
  } catch (error) {
    console.error('[API] GET /notifications failed', error);
    res.status(500).json({ error: 'Không thể tải thông báo' });
  }
});

app.patch('/api/notifications/read-all', async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { userId: userIdFrom(req), readAt: null }, data: { readAt: new Date() } });
    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (error) {
    res.status(500).json({ error: 'Không thể cập nhật thông báo' });
  }
});

app.patch('/api/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const notification = await prisma.notification.findFirst({ where: { id: req.params.id, userId: userIdFrom(req) } });
    if (!notification) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    const updated = await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
    res.json({ notification: serializeNotification(updated) });
  } catch (error) {
    res.status(500).json({ error: 'Không thể cập nhật thông báo' });
  }
});

app.post('/api/vouchers/claim', asyncRoute(async (req: Request, res: Response) => {
  const code = String(req.body.code ?? '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Vui lòng nhập mã ưu đãi' });
  const voucher = await prisma.voucher.findUnique({ where: { code } });
  const now = new Date();
  if (!voucher || !voucher.isActive || voucher.startsAt > now || voucher.expiresAt < now) {
    return res.status(404).json({ error: 'Mã ưu đãi không tồn tại hoặc đã hết hạn' });
  }
  const existing = await prisma.userVoucher.findUnique({
    where: { userId_voucherId: { userId: userIdFrom(req), voucherId: voucher.id } },
  });
  if (existing) return res.status(409).json({ error: 'Mã ưu đãi đã có trong ví của bạn' });
  const claimed = await prisma.userVoucher.create({
    data: { userId: userIdFrom(req), voucherId: voucher.id }, include: { voucher: true },
  });
  res.status(201).json({ voucher: serializeVoucher(claimed), message: `Đã thêm ${code} vào ví ưu đãi` });
}));

app.post('/api/vouchers/apply', asyncRoute(async (req: Request, res: Response) => {
  const { code, orderValue, scope, category } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Vui lòng nhập mã giảm giá' });
  }
  const userVoucher = await prisma.userVoucher.findFirst({
    where: { userId: userIdFrom(req), usedAt: null, voucher: { code: String(code).trim().toUpperCase() } },
    include: { voucher: true },
  });
  const voucher = userVoucher?.voucher;
  const now = new Date();
  if (!voucher || !voucher.isActive || voucher.startsAt > now || voucher.expiresAt < now) {
    return res.status(404).json({ error: 'Mã giảm giá không khả dụng hoặc đã hết hạn' });
  }
  const normalizedScope = String(scope ?? '').toUpperCase();
  if (voucher.scope !== 'ALL' && voucher.scope !== normalizedScope) {
    return res.status(400).json({ error: `Mã này chỉ áp dụng cho ${voucher.scope === 'COURSE' ? 'khóa học' : 'dịch vụ chăm sóc'}` });
  }
  if (voucher.applicableCategories.length && !voucher.applicableCategories.includes(String(category ?? ''))) {
    return res.status(400).json({ error: `Mã chỉ áp dụng cho: ${voucher.applicableCategories.join(', ')}` });
  }
  const amount = Number(orderValue);
  if (!Number.isFinite(amount) || amount < voucher.minOrderValue) {
    return res.status(400).json({
      error: `Giá trị tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')} đ để dùng mã này`,
    });
  }
  const calculated = voucher.discountType === 'PERCENT' ? Math.floor(amount * voucher.discountValue / 100) : voucher.discountValue;
  const discountAmount = Math.min(calculated, voucher.maxDiscountAmount ?? calculated, amount);
  res.json({
    valid: true,
    code: voucher.code,
    title: voucher.title,
    scope: voucher.scope.toLowerCase(),
    discountAmount,
    finalAmount: amount - discountAmount,
    message: `Đã áp dụng ${voucher.code}, giảm ${discountAmount.toLocaleString('vi-VN')} đ`,
  });
}));

// ==========================================
// 7. WEB ADMIN PORTAL ENDPOINTS (GROUP W)
// ==========================================
app.get('/api/admin/overview', (req: Request, res: Response) => {
  res.json({
    kpis: database.admin.kpis,
    weeklyRevenue: database.admin.weeklyRevenue,
    bookingsCount: database.bookings.length,
    studentsCount: database.admin.students.length,
  });
});

app.get('/api/admin/schedule', (req: Request, res: Response) => {
  res.json({
    schedules: database.admin.staffSchedules,
  });
});

app.get('/api/admin/receipts', asyncRoute(async (_req: Request, res: Response) => {
  const invoices = await prisma.invoice.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } });
  res.json({ receipts: invoices.map((item) => ({ ...serializeInvoice(item), customerName: item.user.name, customerPhone: item.user.phone })) });
}));

app.post('/api/admin/receipts', asyncRoute(async (req: Request, res: Response) => {
  const { userId = 'usr_001', bookingId, enrollmentId, title, description, amount, discount = 0, paymentMethod = 'Tiền mặt', status = 'PAID' } = req.body;
  const numericAmount = Number(amount);
  const numericDiscount = Number(discount);
  if (!title?.trim() || !Number.isFinite(numericAmount) || numericAmount < 0 || numericDiscount < 0 || numericDiscount > numericAmount) return res.status(400).json({ error: 'Thông tin hóa đơn không hợp lệ' });
  const paid = String(status).toUpperCase() === 'PAID';
  const invoice = await prisma.$transaction(async (tx) => {
    const saved = await tx.invoice.create({ data: { code: `HD-${new Date().getFullYear()}-${Date.now().toString().slice(-7)}`, userId, bookingId: bookingId || null, enrollmentId: enrollmentId || null, title: title.trim(), description: description || null, amount: numericAmount, discount: numericDiscount, finalAmount: numericAmount - numericDiscount, paymentMethod, status: String(status).toUpperCase() as any, paidAt: paid ? new Date() : null } });
    if (paid) {
      const earnedPoints = Math.floor((numericAmount - numericDiscount) / 10000);
      if (earnedPoints > 0) {
        await tx.user.update({ where: { id: userId }, data: { points: { increment: earnedPoints } } });
        await tx.pointTransaction.create({ data: { userId, description: `Thanh toán ${title.trim()}`, points: earnedPoints, entityType: 'invoice', entityId: saved.id } });
      }
      await tx.notification.create({ data: { userId, type: 'payment', entityId: saved.id, title: 'Thanh toán thành công', message: `Hóa đơn ${saved.code} đã thanh toán ${(numericAmount - numericDiscount).toLocaleString('vi-VN')} đ.` } });
    }
    return saved;
  });
  res.status(201).json({ message: 'Đã ghi nhận hóa đơn', receipt: serializeInvoice(invoice) });
}));

app.post('/api/admin/specialists', asyncRoute(async (req: Request, res: Response) => {
  const { branchId, name, title, specialty, workplace, bio, avatarUrl, experienceYears = 0, consultationFee = 0, serviceIds = [] } = req.body;
  if (!branchId || !name?.trim() || !title?.trim() || !specialty?.trim()) return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin chuyên viên' });
  const specialist = await prisma.specialist.create({ data: { branchId, name: name.trim(), title: title.trim(), specialty: specialty.trim(), workplace: workplace || null, bio: bio || null, avatarUrl: avatarUrl || null, experienceYears: Number(experienceYears), consultationFee: Number(consultationFee), services: { create: serviceIds.map((serviceId: string) => ({ serviceId })) } }, include: { branch: true, services: true, schedules: true } });
  res.status(201).json({ specialist: serializeSpecialist(specialist) });
}));

app.patch('/api/admin/specialists/:id', asyncRoute(async (req: Request, res: Response) => {
  const { serviceIds, ...fields } = req.body;
  const specialist = await prisma.$transaction(async (tx) => {
    if (Array.isArray(serviceIds)) {
      await tx.specialistService.deleteMany({ where: { specialistId: req.params.id } });
      await tx.specialistService.createMany({ data: serviceIds.map((serviceId: string) => ({ specialistId: req.params.id, serviceId })), skipDuplicates: true });
    }
    return tx.specialist.update({ where: { id: req.params.id }, data: { ...(fields.branchId ? { branchId: fields.branchId } : {}), ...(fields.name ? { name: fields.name } : {}), ...(fields.title ? { title: fields.title } : {}), ...(fields.specialty ? { specialty: fields.specialty } : {}), ...(fields.workplace !== undefined ? { workplace: fields.workplace || null } : {}), ...(fields.bio !== undefined ? { bio: fields.bio || null } : {}), ...(fields.avatarUrl !== undefined ? { avatarUrl: fields.avatarUrl || null } : {}), ...(fields.experienceYears !== undefined ? { experienceYears: Number(fields.experienceYears) } : {}), ...(fields.consultationFee !== undefined ? { consultationFee: Number(fields.consultationFee) } : {}), ...(fields.isActive !== undefined ? { isActive: Boolean(fields.isActive) } : {}) }, include: { branch: true, services: true, schedules: true } });
  });
  res.json({ specialist: serializeSpecialist(specialist) });
}));

app.get('/api/admin/students', (req: Request, res: Response) => {
  res.json({
    students: database.admin.students,
  });
});

app.get('/api/admin/bootstrap', async (_req: Request, res: Response) => {
  try {
    const [branches, users, services, specialists, bookings, courses, enrollments, notifications, treatmentPlans, invoices, pointTransactions] = await Promise.all([
      prisma.branch.findMany({ include: { services: { include: { service: true } }, staff: true }, orderBy: { createdAt: 'asc' } }),
      prisma.user.findMany({ include: { bookings: true, enrollments: true }, orderBy: { createdAt: 'desc' } }),
      prisma.service.findMany({ include: { branches: true, specialists: true }, orderBy: { createdAt: 'asc' } }),
      prisma.specialist.findMany({ include: { branch: true, services: true, schedules: true }, orderBy: { name: 'asc' } }),
      prisma.booking.findMany({ include: bookingInclude, orderBy: { scheduledAt: 'desc' } }),
      prisma.course.findMany({ include: { enrollments: true }, orderBy: { createdAt: 'asc' } }),
      prisma.courseEnrollment.findMany({ include: { course: true, user: true }, orderBy: { createdAt: 'desc' } }),
      prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.treatmentPlan.findMany({ include: { user: true, service: true, branch: true, sessions: { orderBy: { sessionNumber: 'asc' } } }, orderBy: { purchasedAt: 'desc' } }),
      prisma.invoice.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } }),
      prisma.pointTransaction.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);
    res.json({
      generatedAt: new Date().toISOString(),
      branches: branches.map((branch) => ({ ...branch, services: branch.services.map((item) => item.service) })),
      users: users.map((user) => ({ ...user, avatar: user.avatarUrl || '' })),
      services: services.map((service) => ({ ...service, price: Number(service.price), originalPrice: service.originalPrice ? Number(service.originalPrice) : null, rating: Number(service.rating) })),
      specialists: specialists.map((specialist) => ({ ...specialist, rating: Number(specialist.rating), consultationFee: Number(specialist.consultationFee) })),
      bookings: bookings.map(serializeBooking),
      courses: courses.map((course) => ({ ...course, price: Number(course.price), deposit: Number(course.deposit) })),
      enrollments: enrollments.map(serializeEnrollment),
      notifications,
      treatmentPlans: treatmentPlans.map(serializeTreatmentPlan),
      invoices: invoices.map((invoice) => ({ ...serializeInvoice(invoice), customerName: invoice.user.name, customerPhone: invoice.user.phone })),
      pointTransactions,
    });
  } catch (error) {
    console.error('[API] GET /admin/bootstrap failed', error);
    res.status(500).json({ error: 'Không thể tải dữ liệu quản trị' });
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error('[API] Unhandled request error', error);
  if (!res.headersSent) res.status(500).json({ error: 'Hệ thống đang bận. Vui lòng thử lại sau.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 [BACKEND] MLD Vietnam Healthcare & Academy Server running at http://localhost:${PORT}`);
  console.log(`📚 [API DOCS] Endpoints available at:`);
  console.log(`   - GET  /api/health`);
  console.log(`   - POST /api/auth/send-otp`);
  console.log(`   - POST /api/auth/verify-otp`);
  console.log(`   - GET  /api/services`);
  console.log(`   - GET  /api/doctors`);
  console.log(`   - POST /api/bookings`);
  console.log(`   - GET  /api/courses`);
  console.log(`   - GET  /api/records`);
  console.log(`   - GET  /api/membership`);
  console.log(`   - GET  /api/admin/overview`);
  console.log(`   - GET  /api/admin/schedule`);
  console.log(`   - GET  /api/admin/receipts`);
  console.log(`   - GET  /api/admin/students`);
});
