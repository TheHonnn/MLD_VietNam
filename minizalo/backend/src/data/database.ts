export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'patient' | 'student' | 'admin' | (string & {});
  avatar: string;
  tier: 'Standard' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | (string & {});
  points: number;
  dob: string;
  gender: 'Nam' | 'Nữ' | 'Khác' | '';
  address: string;
  preferredBranch?: string;
  skinType?: string;
  healthNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  purpose?: 'BEAUTY_SPA' | 'ACADEMY' | 'BOTH';
  referralCode?: string;
}

export interface CourseEnrollment {
  id: string;
  code: string;
  courseId: string;
  courseTitle: string;
  courseImage: string;
  studentName: string;
  phone: string;
  email: string;
  totalAmount: number;
  amountPaid: number;
  progressPercent: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'consulting' | 'deposited' | 'enrolled' | 'studying' | 'graduated' | 'dropped' | (string & {});
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Doctor {
  id: string;
  branchId?: string;
  name: string;
  title: string;
  specialty: string;
  hospital: string;
  experienceYears: number;
  rating: number | null;
  reviewsCount: number;
  avatar: string;
  bio: string;
  reviews?: Record<string, any>[];
}

export interface MedicalService {
  id: string;
  title: string;
  category: string;
  price: number;
  originalPrice?: number;
  durationMinutes: number;
  rating: number | null;
  reviewsCount: number;
  badge?: string;
  image: string;
  description: string;
  categoryId?: string;
  isFeatured?: boolean;
  steps?: (string | Record<string, any>)[];
  benefits?: (string | Record<string, any>)[];
  galleryUrls?: string[];
  reviews?: Record<string, any>[];
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  openingTime?: string;
  closingTime?: string;
  amenities?: (string | Record<string, any>)[];
  galleryUrls?: string[];
}

export interface Booking {
  id: string;
  code: string;
  userId: string;
  userName: string;
  userPhone: string;
  serviceId: string;
  serviceTitle: string;
  serviceImage?: string;
  items?: { serviceId: string; serviceTitle?: string; imageUrl?: string; price: number; durationMinutes: number }[];
  doctorId: string;
  doctorName: string;
  branchId: string;
  branchName: string;
  date: string;
  timeSlot: string;
  price: number;
  discount: number;
  finalPrice: number;
  paymentStatus?: string;
  paymentMethod: 'vnpay' | 'momo' | 'zalopay' | 'hospital' | (string & {});
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'checked_in' | 'in_service' | 'no_show' | (string & {});
  notes?: string;
  qrCode: string;
  qrCodeHash?: string;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  price: number;
  duration: string;
  instructor: string;
  instructorAvatar: string;
  studentsCount: number;
  badge?: string;
  image: string;
  description: string;
  totalHours: number;
  theoryHours: number;
  practiceHours: number;
  depositAmount: number;
  code: string;
  level: string;
  modulesCount: number;
  lessonsCount: number;
  categoryId?: string;
  isFeatured?: boolean;
  learningOutcomes?: (string | Record<string, any>)[];
  certificateTitle?: string;
  instructorProfile?: Record<string, any> | null;
  chapters?: Record<string, any>[];
  batches?: Record<string, any>[];
  schedules?: Record<string, any>[];
  academicRecord?: Record<string, any>;
  certificate?: Record<string, any>;
  lessons: {
    id: string;
    title: string;
    duration: string;
    videoUrl: string;
    isCompleted: boolean;
    chapterId?: string;
    durationMinutes?: number;
    lessonType?: string;
    contentText?: string;
    attachments?: (string | Record<string, any>)[];
    learningGoals?: (string | Record<string, any>)[];
    isFreePreview?: boolean;
    watchedSeconds?: number;
    studentNotes?: string;
  }[];
  quizzes?: NonNullable<Course['quiz']>[];
  quiz?: {
    id: string;
    title: string;
    passingScore: number;
    canonicalPassingScore?: number;
    questionsCount: number;
    questions: {
      id: string;
      question: string;
      options: string[];
      optionKeys?: string[];
      correctAnswerIndex?: never;
    }[];
  };
}

export interface MedicalRecord {
  id: string;
  userId: string;
  recordCode: string;
  diagnosisDate: string;
  doctorName: string;
  facility: string;
  diagnosis: string;
  doctorAdvice: string;
  conditionBefore?: string;
  conditionAfter?: string;
  treatmentNotes?: string;
  beforePhotos?: string[];
  afterPhotos?: string[];
}

export interface Voucher {
  code: string;
  discountAmount?: number;
  discountPercent?: number;
  minOrderValue: number;
  title: string;
  description: string;
  expiryDate: string;
  id?: string;
  scope?: 'service' | 'course' | 'all';
  discountType?: 'fixed' | 'percent';
  discountValue?: number;
  maxDiscountAmount?: number | null;
  applicableCategories?: string[];
  startsAt?: string;
  status?: 'available' | 'used' | 'expired' | (string & {});
}

export const guestUser: User = {
  id: '', name: '', phone: '', email: '', role: 'patient', avatar: '',
  tier: '', points: 0, dob: '', gender: '', address: '',
};
