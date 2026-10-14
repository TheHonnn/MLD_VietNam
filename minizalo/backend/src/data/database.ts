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
  gender: 'Nam' | 'Nữ' | 'Khác';
  address: string;
  preferredBranch?: string;
  skinType?: string;
  healthNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
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
  rating: number;
  reviewsCount: number;
  avatar: string;
  consultationFee: number;
  bio: string;
}

export interface MedicalService {
  id: string;
  title: string;
  category: string;
  price: number;
  originalPrice?: number;
  durationMinutes: number;
  rating: number;
  reviewsCount: number;
  badge?: string;
  image: string;
  description: string;
  indicatorsCount: number;
  preparationNotes: string[];
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  imageUrl?: string;
}

export interface Booking {
  id: string;
  code: string;
  userId: string;
  userName: string;
  userPhone: string;
  serviceId: string;
  serviceTitle: string;
  doctorId: string;
  doctorName: string;
  branchId: string;
  branchName: string;
  date: string;
  timeSlot: string;
  price: number;
  discount: number;
  finalPrice: number;
  paymentMethod: 'vnpay' | 'momo' | 'zalopay' | 'hospital' | (string & {});
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'checked_in' | 'in_service' | 'no_show' | (string & {});
  notes?: string;
  qrCode: string;
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
  rating: number;
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
  lessons: {
    id: string;
    title: string;
    duration: string;
    videoUrl: string;
    isCompleted: boolean;
  }[];
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
  vitalSigns?: {
    bloodPressure: string;
    heartRate: number;
    spO2: number;
    temperature: number;
    weight: number;
  };
  labIndicators: {
    name: string;
    value: string;
    unit: string;
    status: 'Bình thường' | 'Cao' | 'Thấp';
    referenceRange: string;
  }[];
  prescription: {
    medicineName: string;
    dosage: string;
    schedule: string;
    notes: string;
  }[];
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
  tier: 'Standard', points: 0, dob: '', gender: 'Khác', address: '',
};
export const database = {
  users: [] as User[], doctors: [] as Doctor[], branches: [] as Branch[],
  services: [] as MedicalService[], bookings: [] as Booking[], courses: [] as Course[],
  medicalRecords: [] as MedicalRecord[], vouchers: [] as Voucher[],
  admin: {
    kpis: { todayRevenue: 0, yesterdayRevenue: 0, newBookingsToday: 0,
      upcomingAppointments: 0, servingNow: 0, completedToday: 0,
      roomOccupancyRate: 0, cashOnHand: 0, bankTransfer: 0 },
    weeklyRevenue: [], staffSchedules: [], posReceipts: [], students: [],
  },
};
