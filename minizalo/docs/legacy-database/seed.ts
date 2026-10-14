import { BookingStatus, DiscountType, PrismaClient, UserRole, VoucherScope } from '@prisma/client';
import { database } from '../src/data/database.js';

const prisma = new PrismaClient();

const roleMap: Record<string, UserRole> = {
  patient: UserRole.CUSTOMER,
  student: UserRole.STUDENT,
  admin: UserRole.ADMIN,
};

const bookingStatusMap: Record<string, BookingStatus> = {
  pending: BookingStatus.PENDING,
  confirmed: BookingStatus.CONFIRMED,
  completed: BookingStatus.COMPLETED,
  cancelled: BookingStatus.CANCELLED,
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function bookingDate(date: string, timeSlot: string) {
  const [day, month, year] = date.split('/').map(Number);
  const [hour, minute] = timeSlot.split(' - ')[0].split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
}

async function main() {
  for (const user of database.users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatarUrl: user.avatar,
        role: roleMap[user.role] ?? UserRole.CUSTOMER,
        tier: user.tier,
        points: user.points,
        dob: user.dob,
        gender: user.gender,
        address: user.address,
      },
      create: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatarUrl: user.avatar,
        role: roleMap[user.role] ?? UserRole.CUSTOMER,
        tier: user.tier,
        points: user.points,
        dob: user.dob,
        gender: user.gender,
        address: user.address,
      },
    });
  }

  for (const branch of database.branches) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      update: { name: branch.name, address: branch.address, city: branch.city, phone: branch.phone },
      create: { id: branch.id, name: branch.name, address: branch.address, city: branch.city, phone: branch.phone },
    });
  }

  for (const service of database.services) {
    await prisma.service.upsert({
      where: { id: service.id },
      update: {
        name: service.title,
        slug: slugify(service.title),
        category: service.category,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        originalPrice: service.originalPrice,
        rating: service.rating,
        reviewsCount: service.reviewsCount,
        badge: service.badge,
        imageUrl: service.image,
        indicatorsCount: service.indicatorsCount,
        preparationNotes: service.preparationNotes,
      },
      create: {
        id: service.id,
        name: service.title,
        slug: slugify(service.title),
        category: service.category,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        originalPrice: service.originalPrice,
        rating: service.rating,
        reviewsCount: service.reviewsCount,
        badge: service.badge,
        imageUrl: service.image,
        indicatorsCount: service.indicatorsCount,
        preparationNotes: service.preparationNotes,
      },
    });
  }

  for (const branch of database.branches) {
    for (const service of database.services) {
      await prisma.branchService.upsert({
        where: { branchId_serviceId: { branchId: branch.id, serviceId: service.id } },
        update: {},
        create: { branchId: branch.id, serviceId: service.id },
      });
    }
  }

  for (const doctor of database.doctors) {
    const branchId = doctor.hospital.includes('Cầu Giấy') ? 'br_02' : 'br_01';
    await prisma.specialist.upsert({
      where: { id: doctor.id },
      update: {
        branchId,
        name: doctor.name,
        title: doctor.title,
        specialty: doctor.specialty,
        workplace: doctor.hospital,
        bio: doctor.bio,
        avatarUrl: doctor.avatar,
        experienceYears: doctor.experienceYears,
        rating: doctor.rating,
        reviewsCount: doctor.reviewsCount,
        consultationFee: doctor.consultationFee,
      },
      create: {
        id: doctor.id,
        branchId,
        name: doctor.name,
        title: doctor.title,
        specialty: doctor.specialty,
        workplace: doctor.hospital,
        bio: doctor.bio,
        avatarUrl: doctor.avatar,
        experienceYears: doctor.experienceYears,
        rating: doctor.rating,
        reviewsCount: doctor.reviewsCount,
        consultationFee: doctor.consultationFee,
      },
    });

    for (const service of database.services) {
      await prisma.specialistService.upsert({
        where: { specialistId_serviceId: { specialistId: doctor.id, serviceId: service.id } },
        update: {},
        create: { specialistId: doctor.id, serviceId: service.id },
      });
    }
  }

  for (const course of database.courses) {
    await prisma.course.upsert({
      where: { id: course.id },
      update: {
        title: course.title,
        category: course.category,
        price: course.price,
        deposit: Math.min(2_000_000, course.price),
        duration: course.duration,
        instructor: course.instructor,
        imageUrl: course.image,
        description: course.description,
      },
      create: {
        id: course.id,
        title: course.title,
        category: course.category,
        price: course.price,
        deposit: Math.min(2_000_000, course.price),
        duration: course.duration,
        instructor: course.instructor,
        imageUrl: course.image,
        description: course.description,
      },
    });
  }

  for (const booking of database.bookings) {
    await prisma.booking.upsert({
      where: { id: booking.id },
      update: {
        scheduledAt: bookingDate(booking.date, booking.timeSlot),
        status: bookingStatusMap[booking.status] ?? BookingStatus.PENDING,
        notes: booking.notes,
        totalAmount: booking.finalPrice,
      },
      create: {
        id: booking.id,
        code: booking.code,
        userId: booking.userId,
        branchId: booking.branchId,
        serviceId: booking.serviceId,
        specialistId: booking.doctorId,
        scheduledAt: bookingDate(booking.date, booking.timeSlot),
        status: bookingStatusMap[booking.status] ?? BookingStatus.PENDING,
        notes: booking.notes,
        totalAmount: booking.finalPrice,
      },
    });
  }

  const vouchers = [
    {
      id: 'vch_massage20', code: 'MASSAGE20DEMO', title: 'Ưu đãi dịch vụ massage thư giãn',
      description: 'Giảm 20% tối đa 150.000 đ cho dịch vụ Massage từ 300.000 đ.',
      scope: VoucherScope.SERVICE, discountType: DiscountType.PERCENT, discountValue: 20,
      maxDiscountAmount: 150000, minOrderValue: 300000, applicableCategories: ['Massage'],
      startsAt: new Date('2026-01-01T00:00:00.000Z'), expiresAt: new Date('2026-12-31T16:59:59.000Z'),
    },
    {
      id: 'vch_academy100', code: 'ACADEMY100K', title: 'Ưu đãi học viên mới đăng ký khóa học',
      description: 'Giảm trực tiếp 100.000 đ cho học phí đặt cọc khóa học.',
      scope: VoucherScope.COURSE, discountType: DiscountType.FIXED, discountValue: 100000,
      maxDiscountAmount: null, minOrderValue: 1000000, applicableCategories: [],
      startsAt: new Date('2026-01-01T00:00:00.000Z'), expiresAt: new Date('2026-11-30T16:59:59.000Z'),
    },
    {
      id: 'vch_mldvip', code: 'MLD2026VIP', title: 'Tri ân khách hàng thân thiết MLD',
      description: 'Giảm 50.000 đ cho Chăm sóc da hoặc Dẫn lưu bạch huyết.',
      scope: VoucherScope.SERVICE, discountType: DiscountType.FIXED, discountValue: 50000,
      maxDiscountAmount: null, minOrderValue: 300000, applicableCategories: ['Chăm sóc da', 'Dẫn lưu bạch huyết'],
      startsAt: new Date('2026-01-01T00:00:00.000Z'), expiresAt: new Date('2027-02-28T16:59:59.000Z'),
    },
  ];

  for (const voucher of vouchers) {
    await prisma.voucher.upsert({ where: { code: voucher.code }, update: voucher, create: voucher });
    await prisma.userVoucher.upsert({
      where: { userId_voucherId: { userId: 'usr_001', voucherId: voucher.id } },
      update: {}, create: { userId: 'usr_001', voucherId: voucher.id },
    });
  }

  await prisma.treatmentPlan.upsert({
    where: { id: 'plan_massage_10' },
    update: { status: 'ACTIVE', totalSessions: 10, expiresAt: new Date('2026-12-31T16:59:59.000Z') },
    create: {
      id: 'plan_massage_10', userId: 'usr_001', serviceId: 'srv_01', branchId: 'br_01',
      name: 'Gói Massage Thư Giãn 10 Buổi', totalSessions: 10, status: 'ACTIVE',
      purchasedAt: new Date('2026-09-01T00:00:00.000Z'), expiresAt: new Date('2026-12-31T16:59:59.000Z'),
    },
  });

  const treatmentSessions = [
    ['treat_01', 1, '2026-09-05T02:00:00.000Z', 'Khởi động & Thư giãn cơ bản', 'Trần Minh Phương'],
    ['treat_02', 2, '2026-09-15T02:00:00.000Z', 'Massage trị liệu vùng vai gáy', 'Trần Minh Phương'],
    ['treat_03', 3, '2026-09-28T02:00:00.000Z', 'Dẫn lưu bạch huyết vùng lưng', 'Nguyễn Thu Hà'],
    ['treat_04', 4, '2026-10-08T02:00:00.000Z', 'Massage thư giãn toàn thân', 'Trần Minh Phương'],
  ] as const;
  for (const [id, sessionNumber, completedAt, title, specialistName] of treatmentSessions) {
    await prisma.treatmentSession.upsert({
      where: { id },
      update: { status: 'COMPLETED', completedAt: new Date(completedAt), title, specialistName },
      create: { id, planId: 'plan_massage_10', sessionNumber, status: 'COMPLETED', completedAt: new Date(completedAt), title, specialistName },
    });
  }

  const seedInvoices = [
    { id: 'inv_001', code: 'HD-2026-1008', bookingId: 'bk_002', title: 'Massage thư giãn toàn thân', description: 'Chi nhánh 01 - Quận 3', amount: 450000, discount: 0, finalAmount: 450000, paymentMethod: 'VietQR / Chuyển khoản', paidAt: new Date('2026-10-08T03:00:00.000Z') },
    { id: 'inv_002', code: 'HD-2026-0928', bookingId: null, title: 'Gói Massage thư giãn 10 buổi', description: 'Thanh toán gói liệu trình', amount: 4500000, discount: 450000, finalAmount: 4050000, paymentMethod: 'Thẻ ngân hàng', paidAt: new Date('2026-09-01T03:00:00.000Z') },
  ];
  for (const invoice of seedInvoices) {
    await prisma.invoice.upsert({ where: { code: invoice.code }, update: invoice, create: { ...invoice, userId: 'usr_001', status: 'PAID' } });
  }

  const pointHistory = [
    { id: 'point_001', description: 'Hoàn thành buổi Massage thư giãn', points: 150, entityType: 'treatment', entityId: 'treat_04', createdAt: new Date('2026-10-08T03:00:00.000Z') },
    { id: 'point_002', description: 'Đăng ký khóa học đào tạo nghề MLD', points: 300, entityType: 'course', entityId: 'course_01', createdAt: new Date('2026-10-02T03:00:00.000Z') },
    { id: 'point_003', description: 'Đổi voucher giảm giá 50.000 đ', points: -300, entityType: 'voucher', entityId: 'vch_mldvip', createdAt: new Date('2026-09-25T03:00:00.000Z') },
  ];
  for (const transaction of pointHistory) {
    await prisma.pointTransaction.upsert({ where: { id: transaction.id }, update: transaction, create: { ...transaction, userId: 'usr_001' } });
  }

  const [users, branches, services, specialists, bookings, courses] = await Promise.all([
    prisma.user.count(),
    prisma.branch.count(),
    prisma.service.count(),
    prisma.specialist.count(),
    prisma.booking.count(),
    prisma.course.count(),
  ]);

  console.log({ users, branches, services, specialists, bookings, courses });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

