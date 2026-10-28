import type {
  User, Service, Technician, Branch, Booking, BookingItem, Course,
  CourseEnrollment, TreatmentJournal, UserPackage, Coupon, Invoice,
} from '../../../../../database/shared_types';
import type * as View from '../../../../backend/src/data/database';
import {trainingMetadata} from '../utils/training-metadata';

type DisplayFields = { categoryName?: string; branchName?: string; technicianName?: string };
type BookingResponse = Omit<Booking, 'items'> & DisplayFields & {
  customerName?: string; customerPhone?: string; createdAt?: string;
  items?: (BookingItem & { name?: string; serviceTitle?: string; imageUrl?: string })[];
};
type Lesson = { id: string; title: string; durationMinutes: number; videoUrl?: string; isCompleted?: boolean };
type Quiz = { id: string; title: string; passingScore: number; questions: {
  id: string; questionText: string; options: string[] | Record<string, string>;
}[] };
type CourseResponse = Course & DisplayFields & {
  trainingAudience?:View.CourseAudience|null;
  studentsCount?: number; instructorName?: string; instructorAvatar?: string; lessons?: Lesson[]; quiz?: Quiz | null; quizzes?: Quiz[];
};
type UserVoucher = {
  id: string; userId: string; couponId: string; status: string;
  claimedAt: string; expiresAt: string; coupon: Coupon;
};
type Notification = {
  id: string; userId: string; title: string; message: string; type: string;
  data?: View.AppNotification['data'] & { entityId?: string; bookingId?: string; courseId?: string };
  isRead: boolean; createdAt: string;
};
type PointTransaction = {
  id: string; userId: string; pointsChange: number; balanceAfter: number;
  actionType: string; description: string; referenceId?: string; createdAt: string;
};

const lower = (value: unknown) => typeof value==='string'?value.toLowerCase():'';

export const adaptUser = (u: Omit<User, 'phone'> & { phone?: string | null }): View.User => ({
  ...u, phone: u.phone || '', name: u.fullName, avatar: u.avatarUrl || '', email: u.email || '',
  role: u.role === 'CUSTOMER' ? 'patient' : lower(u.role),
  tier: u.membershipTier.charAt(0) + lower(u.membershipTier.slice(1)),
  points: Number(u.rewardPoints), dob: (u.dateOfBirth || '').slice(0, 10),
  gender: u.gender === 'MALE' ? 'Nam' : u.gender === 'FEMALE' ? 'Nữ' : u.gender === 'OTHER' ? 'Khác' : '',
  address: u.address || '', emergencyContactName: u.emergencyContactName || '',
  emergencyContactPhone: u.emergencyContactPhone || '',
});

export const adaptService = (s: Service & DisplayFields & {ratingAvg?: number | null; reviewCount?: number; reviews?: Record<string,any>[]}): View.MedicalService => ({
  ...s, title: s.name, category: s.categoryName || s.category?.name || '',
  price: Number(s.discountPrice ?? s.price),
  originalPrice: s.discountPrice != null ? Number(s.price) : undefined,
  image: s.imageUrl, description: s.fullDescription || s.shortDescription || '',
  rating: s.ratingAvg == null ? null : Number(s.ratingAvg), reviewsCount: Number(s.reviewCount || 0),
});

export const adaptDoctor = (d: Technician & DisplayFields): View.Doctor => ({
  ...d, name: d.fullName, specialty: Array.isArray(d.specialties)?d.specialties.join(', '):'',
  hospital: d.branchName || '', rating: d.ratingAvg == null ? null : Number(d.ratingAvg),
  reviewsCount: Number(d.reviewCount), avatar: d.avatarUrl,
  bio: d.bio || '',
});

export const adaptBranch = (b: Branch): View.Branch => ({ ...b });

export const adaptBooking = (b: BookingResponse): View.Booking => ({
  ...b, code: b.bookingCode, userId: b.customerId,
  userName: b.bookedForName || b.customerName || b.customer?.fullName || '',
  userPhone: b.bookedForPhone || b.customerPhone || b.customer?.phone || '',
  serviceId: b.items?.[0]?.serviceId || '',
  serviceTitle: (b.items || []).map(i => i.name || i.serviceTitle || i.service?.name || '').filter(Boolean).join(', '),
  serviceImage: b.items?.[0]?.imageUrl || '',
  doctorId: b.technicianId || '', doctorName: b.technicianName || b.technician?.fullName || '',
  branchName: b.branchName || b.branch?.name || '', date: b.bookingDate,
  timeSlot: b.startTime + ' - ' + b.endTime, price: Number(b.baseTotal),
  discount: Number(b.discountAmount) + Number(b.pointsDiscount),
  finalPrice: Number(b.finalPrice), paymentMethod: lower(b.paymentMethod),
  paymentStatus: b.paymentStatus ? lower(b.paymentStatus) : undefined,
  status: lower(b.status), notes: b.specialNotes || undefined,
  qrCode: b.qrCodeHash || '', createdAt: b.createdAt || '',
});

const adaptQuiz = (quiz: Quiz): NonNullable<View.Course['quiz']> => ({
  maxAttempts:(quiz as any).maxAttempts,attemptsUsed:(quiz as any).attemptsUsed,
  id: quiz.id, title: quiz.title, passingScore: Number(quiz.passingScore) * 10,
  canonicalPassingScore: Number(quiz.passingScore),
  questionsCount: (quiz.questions || []).length,
  questions: (quiz.questions || []).map(q => {
    const keys = Array.isArray(q.options) ? q.options.map((_, index) => String.fromCharCode(65 + index)) : Object.keys(q.options || {}).sort();
    return { id: q.id, question: q.questionText, correctOption:(q as any).correctOption,explanation:(q as any).explanation, optionKeys: keys,
      options: Array.isArray(q.options) ? q.options : keys.map(key => (q.options as Record<string, string>)[key]) };
  }),
});

export const adaptCourse = (c: CourseResponse): View.Course => ({
  ...c, ...trainingMetadata(c), category: c.categoryName || '', price: Number(c.tuitionFee),
  trainingAudience:c.trainingAudience!==undefined?c.trainingAudience:c.level==='BEGINNER'?'BEGINNER':['INTERMEDIATE','ADVANCED','MASTER'].includes(c.level)?'PRACTITIONER':null,
  duration: c.totalHours + ' giờ', instructor: c.instructorName || '',
  instructorAvatar: c.instructorAvatar || '', instructorProfile: (c as any).instructor || null, studentsCount: Number(c.studentsCount || 0),
  image: c.imageUrl, description: c.fullDescription || c.shortDescription || '',
  depositAmount: Number(c.depositAmount), modulesCount: Number((c as any).modulesCount || 0), lessonsCount: (c.lessons || []).length,
  lessons: (c.lessons || []).map(l => ({
    ...l, duration: l.durationMinutes + ' phút', videoUrl: l.videoUrl || '',
    isCompleted: l.isCompleted === true,
  })),
  quizzes: (c.quizzes ?? (c.quiz ? [c.quiz] : [])).map(adaptQuiz),
  quiz: c.quiz ? adaptQuiz(c.quiz) : undefined,
  quizSubmissions: (c as any).quizSubmissions?.map((submission: any) => ({...submission,
    questions: adaptQuiz({id:submission.quizId,title:'',passingScore:0,questions:submission.questions||[]} as Quiz).questions,
  })),
});

export const adaptEnrollment = (e: CourseEnrollment & {
  courseTitle?: string; courseImage?: string; studentName?: string; phone?: string; email?: string;
}): View.CourseEnrollment => ({
  ...e, code: '', courseTitle: e.courseTitle || e.course?.title || '',
  courseImage: e.courseImage || e.course?.imageUrl || '',
  studentName: e.studentName || e.student?.fullName || '',
  phone: e.phone || e.student?.phone || '', email: e.email || e.student?.email || '',
  totalAmount: Number(e.tuitionTotal), amountPaid: Number(e.amountPaid),
  progressPercent: Number(e.progressPercent), status: lower(e.status), createdAt: e.enrolledAt,
});

export const adaptVoucher = (v: UserVoucher): View.Voucher => ({
  ...v, code: v.coupon.code, title: v.coupon.title,
  description: v.coupon.description || '', discountAmount: Number(v.coupon.discountAmount),
  discountPercent: Number(v.coupon.discountPercent), minOrderValue: Number(v.coupon.minOrderAmount),
  expiryDate: v.expiresAt, startsAt: v.coupon.validFrom, status: lower(v.status),
  maxDiscountAmount: v.coupon.maxDiscount, discountType: v.coupon.discountPercent > 0 ? 'percent' : 'fixed',
  discountValue: Number(v.coupon.discountPercent || v.coupon.discountAmount),
});

export const adaptRecord = (j: TreatmentJournal & DisplayFields): View.MedicalRecord => ({
  ...j, userId: j.customerId, recordCode: j.id, diagnosisDate: j.sessionDate,
  doctorName: j.technicianName || '', facility: j.branchName || '',
  diagnosis: j.conditionAfter || j.conditionBefore || '',
  conditionBefore: j.conditionBefore || '', conditionAfter: j.conditionAfter || '',
  treatmentNotes: j.treatmentNotes || '',
  doctorAdvice: j.specialistAdvice || '',
});

export const adaptTreatmentPlan = (p: UserPackage & { sessions?: (TreatmentJournal & DisplayFields)[] }) => ({
  ...p, name: p.package?.name || '', image: p.package?.imageUrl || '',
  usedSessions: p.completedSessions, remainingSessions: Math.max(0, p.totalSessions - p.completedSessions),
  progressPercent: p.totalSessions ? p.completedSessions / p.totalSessions * 100 : 0,
  status: lower(p.status), purchaseDate: p.purchasedAt, expiryDate: p.expiresAt,
  sessions: (p.sessions || []).map(j => ({
    ...j, completedAt: j.sessionDate, title: j.treatmentNotes || '',
    specialistName: j.technicianName || '',
  })),
});

export const adaptInvoice = (i: Invoice & { title?: string }) => ({
  ...i, code: i.invoiceCode, amount: Number(i.subtotal), finalAmount: Number(i.totalAmount),
  status: lower(i.paymentStatus), createdAt: i.paidAt, title: i.title || i.invoiceCode,
});
export const adaptPointTransaction = (p: PointTransaction) => ({ ...p, points: Number(p.pointsChange) });
export const adaptNotification = (n: Notification): View.AppNotification => ({
  ...n, entityId: n.data?.entityId || n.data?.bookingId || n.data?.courseId,
});

const adapters: Record<string, (value: any) => any> = {
  quiz: adaptQuiz,
  user: adaptUser, services: adaptService, doctors: adaptDoctor, branches: adaptBranch,
  courses: adaptCourse, course: adaptCourse, bookings: adaptBooking, booking: adaptBooking,
  records: adaptRecord, vouchers: adaptVoucher, voucher: adaptVoucher,
  notifications: adaptNotification, treatmentPlans: adaptTreatmentPlan,
  enrollments: adaptEnrollment, enrollment: adaptEnrollment,
  invoices: adaptInvoice, pointTransactions: adaptPointTransaction,
};

export function adaptPayload(payload: Record<string, any>) {
  const result = { ...payload };
  for (const key of Object.keys(adapters)) {
    if (result[key] == null) continue;
    result[key] = Array.isArray(result[key]) ? result[key].map(adapters[key]) : adapters[key](result[key]);
  }
  return result;
}

export function profileToCanonical(profile: Record<string, any>) {
  const { name, dob, avatar, gender, ...rest } = profile;
  return {
    fullName: name !== undefined ? name : rest.fullName,
    dateOfBirth: dob !== undefined ? dob === '' ? null : dob : rest.dateOfBirth === '' ? null : rest.dateOfBirth,
    avatarUrl: avatar !== undefined ? avatar : rest.avatarUrl,
    gender: gender === 'Nam' ? 'MALE' : gender === 'Nữ' ? 'FEMALE' : gender === 'Khác' ? 'OTHER' : gender === '' ? null : gender,
    email: rest.email, address: rest.address,occupation:rest.occupation,
    emergencyContactName: rest.emergencyContactName, emergencyContactPhone: rest.emergencyContactPhone,
    preferredBranch:rest.preferredBranch,skinType:rest.skinType,healthNotes:rest.healthNotes,
    ...(rest.purpose !== undefined ? { purpose: rest.purpose } : {}),
  };
}
