/**
 * ==============================================================================
 * MLD VIỆT NAM - SHARED TYPES & DATA CONTRACTS (SINGLE SOURCE OF TRUTH)
 * File định nghĩa kiểu dữ liệu dùng chung cho Backend NestJS và Web Admin React
 * Đồng bộ 100% với Database Schema trong checkdata/FULL_DATABASE_STRUCTURE.sql
 * ==============================================================================
 */

// ==============================================================================
// 1. DANH MỤC 21 ENUMS CHUẨN HÓA (100% VIẾT HOA)
// ==============================================================================

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  STUDENT = 'STUDENT',
  TECHNICIAN = 'TECHNICIAN',
  INSTRUCTOR = 'INSTRUCTOR',
  CASHIER = 'CASHIER',
  RECEPTIONIST = 'RECEPTIONIST',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum PurposeInterest {
  BEAUTY_SPA = 'BEAUTY_SPA',
  ACADEMY = 'ACADEMY',
  BOTH = 'BOTH',
}

export enum MemberTier {
  STANDARD = 'STANDARD',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

export enum RoomType {
  VIP_ROOM = 'VIP_ROOM',
  MASSAGE_ROOM = 'MASSAGE_ROOM',
  HEAD_SPA_ROOM = 'HEAD_SPA_ROOM',
  SKINCARE_ROOM = 'SKINCARE_ROOM',
  ACADEMY_CLASSROOM = 'ACADEMY_CLASSROOM',
  PRACTICE_LAB = 'PRACTICE_LAB',
}

export enum SlotStatus {
  AVAILABLE = 'AVAILABLE',
  HOLD = 'HOLD',
  BOOKED = 'BOOKED',
  BLOCKED = 'BLOCKED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  IN_SERVICE = 'IN_SERVICE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum PackageStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
}

export enum CourseLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  MASTER = 'MASTER',
}

export enum BatchStatus {
  UPCOMING = 'UPCOMING',
  OPEN_FOR_ENROLLMENT = 'OPEN_FOR_ENROLLMENT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum EnrollmentStatus {
  CONSULTING = 'CONSULTING',
  DEPOSITED = 'DEPOSITED',
  ENROLLED = 'ENROLLED',
  STUDYING = 'STUDYING',
  GRADUATED = 'GRADUATED',
  DROPPED = 'DROPPED',
}

export enum LessonType {
  VIDEO = 'VIDEO',
  READING_DOC = 'READING_DOC',
  PRACTICE_GUIDE = 'PRACTICE_GUIDE',
  QUIZ = 'QUIZ',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CASH_AT_SPA = 'CASH_AT_SPA',
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
  BANK_TRANSFER = 'BANK_TRANSFER',
  MEMBERSHIP_WALLET = 'MEMBERSHIP_WALLET',
  SPLIT_PAYMENT = 'SPLIT_PAYMENT',
}

export enum VoucherStatus {
  AVAILABLE = 'AVAILABLE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
}

export enum TicketStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum StaffDepartment {
  RECEPTION = 'RECEPTION',
  CASHIER = 'CASHIER',
  THERAPY_MASSAGE = 'THERAPY_MASSAGE',
  SKINCARE = 'SKINCARE',
  ACADEMY_TRAINING = 'ACADEMY_TRAINING',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
  ADMINISTRATION = 'ADMINISTRATION',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  PROBATION = 'PROBATION',
  INTERN = 'INTERN',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum VoucherDistributionTrigger {
  ON_SIGNUP = 'ON_SIGNUP',
  ON_BIRTHDAY = 'ON_BIRTHDAY',
  ON_TIER_UPGRADE = 'ON_TIER_UPGRADE',
  ON_FIRST_BOOKING = 'ON_FIRST_BOOKING',
  REFERRAL_INVITER = 'REFERRAL_INVITER',
  REFERRAL_INVITEE = 'REFERRAL_INVITEE',
  MANUAL_BY_ADMIN = 'MANUAL_BY_ADMIN',
  PUBLIC_CLAIM = 'PUBLIC_CLAIM',
}

export enum CertificateStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  REVOKED = 'REVOKED',
}

export enum TuitionTransType {
  DEPOSIT = 'DEPOSIT',
  FULL_PAYMENT = 'FULL_PAYMENT',
  INSTALLMENT_1 = 'INSTALLMENT_1',
  INSTALLMENT_2 = 'INSTALLMENT_2',
  REMAINING_BALANCE = 'REMAINING_BALANCE',
  REFUND = 'REFUND',
}

// ==============================================================================
// 2. CHUẨN ĐÓNG GÓI API RESPONSE (STANDARD ENVELOPE)
// ==============================================================================

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// ==============================================================================
// 3. TYPES & INTERFACES CHO TOÀN BỘ CSDL (CAMELCASE CHUẨN API)
// ==============================================================================

export interface User {
  id: string;
  phone: string;
  email?: string | null;
  fullName: string;
  avatarUrl?: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  purpose: PurposeInterest;
  role: UserRole;
  membershipTier: MemberTier;
  rewardPoints: number;
  totalSpent: number;
  referralCode: string;
  referredById?: string | null;
  isActive: boolean;
  lockedReason?: string | null;
  lockedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  latitude: number;
  longitude: number;
  openingTime: string;
  closingTime: string;
  imageUrl: string;
  galleryUrls: string[];
  amenities: string[];
  isActive: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BranchRoom {
  id: string;
  branchId: string;
  name: string;
  roomType: RoomType;
  bedCapacity: number;
  isAvailable: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  createdAt?: string;
}

export interface StaffProfile {
  id: string;
  userId: string;
  branchId: string;
  employeeCode: string;
  department: StaffDepartment;
  position: string;
  employmentType: EmploymentType;
  baseSalary: number;
  commissionRate: number;
  hireDate: string;
  resignationDate?: string | null;
  idCardNumber?: string | null;
  isActive: boolean;
  user?: User;
  branch?: Branch;
}

export interface Technician {
  id: string;
  userId?: string | null;
  branchId: string;
  staffProfileId?: string | null;
  fullName: string;
  title: string;
  avatarUrl: string;
  experienceYears: number;
  ratingAvg: number;
  reviewCount: number;
  specialties: string[];
  bio?: string | null;
  isActive: boolean;
}

export interface Instructor {
  id: string;
  userId?: string | null;
  fullName: string;
  title: string;
  avatarUrl?: string;
  experienceYears?: number;
  bio?: string | null;
  achievements?: string[];
  isActive?: boolean;
  createdAt?: string;
  user?: Partial<User>;
}

export interface ServiceCategory {
  id: string;
  name: string;
  code: string;
  iconUrl: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface Service {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  durationMinutes: number;
  price: number;
  discountPrice?: number | null;
  imageUrl: string;
  galleryUrls: string[];
  steps: { step: number; title: string; desc: string }[];
  benefits: string[];
  isFeatured: boolean;
  isActive: boolean;
  category?: ServiceCategory;
}

export interface BookingItem {
  id: string;
  bookingId: string;
  serviceId: string;
  technicianId?: string | null;
  durationMinutes: number;
  price: number;
  service?: Service;
  technician?: Technician;
}

export interface Booking {
  id: string;
  bookingCode: string;
  customerId: string;
  branchId: string;
  assignedRoomId?: string | null;
  assignedBedNumber?: string | null;
  technicianId?: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  baseTotal: number;
  couponId?: string | null;
  discountAmount: number;
  pointsUsed: number;
  pointsDiscount: number;
  finalPrice: number;
  bookedForName?: string | null;
  bookedForPhone?: string | null;
  specialNotes?: string | null;
  qrCodeHash: string;
  
  // Quản lý Check-in / Check-out
  checkedInAt?: string | null;
  checkedInById?: string | null;
  serviceStartedAt?: string | null;
  checkedOutAt?: string | null;
  checkedOutById?: string | null;
  actualDurationMinutes?: number | null;
  checkinNotes?: string | null;
  hasMedicalAlert: boolean;
  
  cancellationReason?: string | null;
  customer?: User;
  branch?: Branch;
  room?: BranchRoom;
  technician?: Technician;
  items?: BookingItem[];
}

export interface TreatmentPackage {
  id: string;
  name: string;
  serviceId?: string | null;
  totalSessions: number;
  price: number;
  discountPrice?: number | null;
  validityMonths: number;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

export interface UserPackage {
  id: string;
  customerId: string;
  packageId: string;
  totalSessions: number;
  completedSessions: number;
  status: PackageStatus;
  purchasedAt: string;
  expiresAt: string;
  package?: TreatmentPackage;
}

export interface TreatmentJournal {
  id: string;
  userPackageId?: string | null;
  bookingId?: string | null;
  customerId: string;
  technicianId?: string | null;
  assignedRoomId?: string | null;
  sessionNumber: number;
  sessionDate: string;
  conditionBefore?: string | null;
  conditionAfter?: string | null;
  treatmentNotes?: string | null;
  beforePhotos: string[];
  afterPhotos: string[];
  specialistAdvice?: string | null;
  customerSignatureUrl?: string | null;
}

export interface CourseCategory {
  id: string;
  name: string;
  code: string;
  iconUrl: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  categoryId: string;
  primaryInstructorId?: string | null;
  title: string;
  code: string;
  shortDescription: string;
  fullDescription: string;
  level: CourseLevel;
  totalHours: number;
  theoryHours: number;
  practiceHours: number;
  totalLessons: number;
  tuitionFee: number;
  depositAmount: number;
  learningOutcomes: string[];
  certificateTitle: string;
  imageUrl: string;
  isFeatured: boolean;
  isActive: boolean;
}

export interface CourseBatch {
  id: string;
  courseId: string;
  branchId: string;
  batchCode: string;
  instructorId?: string | null;
  startDate: string;
  endDate: string;
  scheduleText: string;
  maxStudents: number;
  enrolledCount: number;
  status: BatchStatus;
  course?: Course;
  branch?: Branch;
}

export interface CourseEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  batchId?: string | null;
  status: EnrollmentStatus;
  tuitionTotal: number;
  amountPaid: number;
  completedLessonsCount: number;
  progressPercent: number;
  enrolledAt: string;
  student?: User;
  course?: Course;
  batch?: CourseBatch;
}

export interface StudentAttendance {
  id: string;
  scheduleId: string;
  enrollmentId: string;
  status: AttendanceStatus;
  checkInTime?: string | null;
  notes?: string | null;
  markedById?: string | null;
}

export interface StudentCertificate {
  id: string;
  enrollmentId: string;
  studentId: string;
  courseId: string;
  certificateCode: string;
  qrVerificationCode: string;
  studentName: string;
  courseTitle: string;
  issueDate: string;
  theoryScore: number;
  practicalScore: number;
  finalGrade: string;
  certificatePdfUrl?: string | null;
  status: CertificateStatus;
}

export interface TuitionTransaction {
  id: string;
  transactionCode: string;
  enrollmentId: string;
  studentId: string;
  courseId: string;
  branchId: string;
  cashierId?: string | null;
  transactionType: TuitionTransType;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  receiptNumber?: string | null;
  receiptPdfUrl?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  paidAt: string;
}

export interface Invoice {
  id: string;
  invoiceCode: string;
  branchId: string;
  customerId: string;
  cashierId?: string | null;
  bookingId?: string | null;
  userPackageId?: string | null;
  enrollmentId?: string | null;
  subtotal: number;
  discountAmount: number;
  pointsRedeemedAmount: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  gatewayTransactionId?: string | null;
  receiptPdfUrl?: string | null;
  refundAmount: number;
  refundedAt?: string | null;
  refundReason?: string | null;
  paidAt: string;
  customer?: User;
  branch?: Branch;
  serviceTitle?: string;
  serviceCategory?: 'SERVICE' | 'PACKAGE' | 'ACADEMY' | 'OTHER';
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discountPercent: number;
  discountAmount: number;
  maxDiscount?: number | null;
  minOrderAmount: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

export interface MembershipTierRule {
  tier: MemberTier;
  minAccumulatedSpent: number;
  pointEarningRate: number;
  discountServicePercent: number;
  freeHeadSpaSessions: number;
  birthdayVoucherId?: string | null;
  priorityBooking: boolean;
  description?: string | null;
}

export interface LoyaltyPointSetting {
  id: number;
  earnAmountPerPoint: number;
  redeemValuePerPoint: number;
  maxRedeemPercentPerOrder: number;
  pointExpiryMonths: number;
  isActive: boolean;
}

export interface VoucherDistributionRule {
  id: string;
  couponId: string;
  triggerEvent: VoucherDistributionTrigger;
  targetTier?: MemberTier | null;
  isAutoGrant: boolean;
  notifyUser: boolean;
  validDaysAfterClaim: number;
  description: string;
  isActive: boolean;
}
