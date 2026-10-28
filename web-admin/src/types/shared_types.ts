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

export enum BedStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE',
}

export enum ShiftStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  RECONCILED = 'RECONCILED',
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

export enum ConsultationStatus {
  PENDING_CONSULTATION = 'PENDING_CONSULTATION',
  CONSULTING = 'CONSULTING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentVerificationStatus {
  UNPAID = 'UNPAID',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  PAID = 'PAID',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
}

export enum StudentAdmissionStatus {
  NOT_APPROVED = 'NOT_APPROVED',
  APPROVED = 'APPROVED',
  ENROLLED = 'ENROLLED',
}

export interface ConsultationNote {
  timestamp: string;
  author: string;
  note: string;
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
  clinicalNotes?: string | null;
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

export interface BranchBed {
  id: string;
  branchId: string;
  roomId: string;
  bedCode: string;
  name: string;
  status: BedStatus;
  isActive: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  room?: BranchRoom;
  branch?: Branch;
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
  rating?: number;
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
  bedId?: string | null;
  bed?: BranchBed;
  parentBookingId?: string | null;
  guestCount?: number;
  bookingSource?: 'AUTO_OPTIMIZED' | 'MANUAL' | 'TREATMENT_PACKAGE';
  sessionStatus?: 'NOT_STARTED' | 'IN_SERVICE' | 'COMPLETED';
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
  treatmentStartTime?: string | null;
  treatmentEndTime?: string | null;
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

export interface CourseChapter {
  id: string;
  courseId: string;
  chapterOrder: number;
  title: string;
  description?: string | null;
  createdAt?: string;
  course?: Course;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  chapterId: string;
  lessonOrder: number;
  title: string;
  lessonType: LessonType | string;
  durationMinutes: number;
  videoUrl?: string | null;
  contentText?: string | null;
  attachments?: { name: string; url: string }[];
  learningGoals?: string[];
  isFreePreview: boolean;
  createdAt?: string;
  chapter?: CourseChapter;
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
  studentName?: string;
  studentPhone?: string;
  studentEmail?: string;
  selectedBranch?: string;
  approvalStatus?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  // Quy trình 3 nhóm trạng thái độc lập
  orderCode?: string;
  consultationStatus?: ConsultationStatus | string;
  paymentVerificationStatus?: PaymentVerificationStatus | string;
  studentAdmissionStatus?: StudentAdmissionStatus | string;
  assignedStaffId?: string | null;
  finalTuition?: number;
  consultationHistory?: ConsultationNote[];
  qrCreatedAt?: string | null;
  // Hạn định khóa học 1 năm & Quản lý vòng đời
  validUntil?: string;
  accessStatus?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'EXTENDED';
  expiredAt?: string | null;
  extensionMonths?: number;
  extensionReason?: string | null;
  lastExpiryNotifiedAt?: string | null;
  student?: User;
  course?: Course;
  batch?: CourseBatch;
}

export interface DualSlotAvailability {
  slotTime: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  freeBeds: number;
  freeStaff: number;
  remainingCapacity: number;
  statusText: string;
  recommendedOrder: number;
  isRecommended?: boolean;
  recommendedTag?: string | null;
  capacity?: number;
  availableBeds?: number;
  availableTechnicians?: number;
  reason?: string;
  recommended?: boolean;
}

export interface BatchSchedule {
  id: string;
  batchId: string;
  assignedRoomId?: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  topic: string;
  isPracticeLab: boolean;
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

export enum EdemaAssessmentStatus {
  WAITING_CONFIRMATION = 'WAITING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum EdemaAssessmentResult {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  NEEDS_FOLLOW_UP = 'NEEDS_FOLLOW_UP',
}

export interface EdemaAssessment {
  id: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  branchId: string;
  examinerId?: string | null;
  assessmentDate: string;
  timeSlot: string;
  status: EdemaAssessmentStatus;
  result: EdemaAssessmentResult;
  stageLevel?: string | null;
  circumferenceMeasurements?: Record<string, string> | any;
  clinicalNotes?: string | null;
  certificateIssuedId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  branch?: Branch;
  examiner?: User;
}

export interface StudentCertificate {
  id: string;
  enrollmentId?: string | null;
  studentId?: string | null;
  courseId?: string | null;
  certificateCode: string;
  qrVerificationCode: string;
  studentName: string;
  dateOfBirth?: string | null;
  courseTitle: string;
  issueDate: string;
  theoryScore?: number | null;
  practicalScore?: number | null;
  finalGrade: string;
  certificatePdfUrl?: string | null;
  qrImageUrl?: string | null;
  signerName?: string | null;
  signerTitle?: string | null;
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

export interface CashierShift {
  id: string;
  branchId: string;
  cashierId: string;
  shiftCode: string;
  openingCash: number;
  closingCash?: number;
  systemCash?: number;
  cardSales?: number;
  transferSales?: number;
  totalSales?: number;
  discrepancyAmount?: number;
  status: ShiftStatus;
  openedAt: string;
  closedAt?: string | null;
  notes?: string | null;
  cashier?: User;
  branch?: Branch;
  createdAt?: string;
  updatedAt?: string;
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
  shiftId?: string | null;
  subtotal: number;
  discountAmount: number;
  pointsRedeemedAmount: number;
  preTaxAmount?: number;
  vatRate?: number;
  vatAmount: number;
  totalAmount: number;
  printedCount?: number;
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
  shift?: CashierShift;
  serviceTitle?: string;
  serviceCategory?: 'SERVICE' | 'PACKAGE' | 'ACADEMY' | 'OTHER';
  items?: Array<{
    id: string;
    itemName: string;
    itemType: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}

export interface InvoiceSyncResult {
  syncedEnrollmentInvoices: number;
  syncedBookingInvoices: number;
  syncedTuitionTransactions: number;
  totalSyncedAmount: number;
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

// ==========================================
// ENTERPRISE EXTENSION TYPES
// ==========================================

export interface AuditLog {
  id: string;
  tableName: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string;
  performedBy?: string | null;
  ipAddress?: string;
  userAgent?: string;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  description?: string | null;
  createdAt: string;
}

export interface StaffCommission {
  id: string;
  staffId: string;
  branchId: string;
  bookingId?: string | null;
  invoiceId?: string | null;
  commissionType: 'SERVICE_DIRECT' | 'PACKAGE_UPSELL' | 'CSAT_BONUS';
  baseAmount: number;
  percentage: number;
  commissionAmount: number;
  status: 'PENDING_APPROVAL' | 'PENDING' | 'APPROVED' | 'PAID';
  cycleMonth: string;
  notes?: string | null;
  createdAt: string;
  staffName?: string;
  branchName?: string;
}

export interface ServiceMaterial {
  id: string;
  serviceId: string;
  materialName: string;
  dosagePerSession: number;
  unit: string;
  notes?: string | null;
  serviceName?: string;
}

export interface InventoryConsumptionLog {
  id: string;
  branchId: string;
  serviceId?: string | null;
  bookingId?: string | null;
  invoiceId?: string | null;
  technicianId?: string | null;
  materialName: string;
  quantityDeducted: number;
  unit: string;
  loggedAt: string;
  serviceName?: string;
  branchName?: string;
  technicianName?: string;
}

export interface ZNSTemplate {
  id: string;
  templateCode: string;
  name: string;
  description?: string | null;
  contentTemplate: string;
  sampleParams: Record<string, string>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ZaloZnsLog {
  id: string;
  recipientPhone?: string;
  recipientName?: string | null;
  templateCode?: string;
  bookingId?: string | null;
  paramsSent?: Record<string, any>;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  responseCode?: string | null;
  errorMessage?: string | null;
  sentAt: string;
  customerId?: string;
  customerName?: string;
  phone?: string;
  templateType?: 'BOOKING_CONFIRM' | 'PRE_REMINDER_2H' | 'POST_CARE_24H' | 'REVISIT_14D';
  contentPreview?: string;
}

// ==========================================
// PORTAL CONTENT & CMS TYPES
// ==========================================
export type PortalContentKind = 'BANNER' | 'DOCUMENT' | 'COMMUNITY' | 'ARTICLE';
export type PortalContentStatus = 'DRAFT' | 'PUBLISHED' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'ARCHIVED';
export type DocumentAccessLevel = 'PUBLIC' | 'FREE_TRIAL' | 'MEMBERS_ONLY';

export interface PortalContentItem {
  id: string;
  kind: PortalContentKind;
  title: string;
  summary: string;
  contentText: string;
  imageUrl?: string;
  targetLink?: string;
  sortOrder: number;
  downloadCount: number;
  isFeatured: boolean;
  category?: string;
  accessLevel: DocumentAccessLevel;
  fileUrl?: string;
  fileSizeBytes: number;
  likesCount: number;
  commentsCount: number;
  status: PortalContentStatus;
  authorName?: string;
  authorAvatar?: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// AUTOMATED EMAIL NOTIFICATION TYPES
// ==========================================
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description?: string;
  bodyHtml: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  templateId?: string;
  subject: string;
  bodyHtml: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  metadata?: Record<string, any>;
  errorMessage?: string;
  sentAt: string;
  createdAt: string;
}
