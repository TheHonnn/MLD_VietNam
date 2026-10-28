export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  isPhoneVerified: boolean;
  email: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  avatarUrl?: string;
  memberCode: string;
}

export interface Branch {
  id: string;
  code?: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  distanceKm: string;
  openingHours: string;
  rating: number;
  imageUrl: string;
  services: string[];
  district?: string;
}

export interface SpaService {
  id: string;
  name: string;
  categoryName: string;
  shortDescription: string;
  fullDescription: string;
  durationMinutes: number;
  price: number;
  vatRate: number;
  imageUrl: string;
  isFeatured?: boolean;
}

export interface Specialist {
  id: string;
  name: string;
  title: string;
  avatarUrl: string;
  branchName: string;
  experienceYears: number;
  bio?: string;
}

export interface Appointment {
  id: string;
  bookingCode: string;
  serviceName: string;
  serviceImage: string;
  durationMinutes: number;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  specialistName: string;
  specialistTitle: string;
  specialistAvatar: string;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:00 - 09:45"
  customerName: string;
  customerPhone: string;
  specialNotes?: string;
  totalAmount: number;
  paymentMethod: string; // "Thanh toán tại cơ sở / QR"
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  category: string; // "Người mới bắt đầu" | "Kỹ thuật viên" | "Y bác sĩ"
  level: string; // "Cơ bản" | "Nâng cao" | "Chuyên sâu"
  durationWeeks: number;
  totalHours: number;
  theoryHours: number;
  practiceHours: number;
  tuitionFee: number;
  depositFee: number;
  image: string;
  instructorName: string;
  instructorTitle: string;
  instructorAvatar: string;
  branch: string;
  schedule: string;
  description: string;
  youtubeId?: string;
}

export interface Lesson {
  id: string;
  title: string;
  durationMinutes: number;
  youtubeId?: string;
  videoUrl?: string;
  isFreePreview?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  category: string;
  imageUrl?: string;
  pdfUrl?: string;
  pdfTitle?: string;
  pdfFileSize?: string;
  publishedAt: string;
  likesCount: number;
  viewsCount: number;
}

export interface PortalBanner {
  id: string;
  title: string;
  summary: string;
  content_text?: string;
  image_url: string;
  target_link?: string;
  author_name?: string;
  category?: string;
}

export interface MedicalDocument {
  id: string;
  title: string;
  slug?: string;
  category: string;
  readTimeMinutes: number;
  summary: string;
  content: string;
  steps?: any[];
  imageUrl?: string;
  authorName?: string;
  publishedAt?: string;
  viewCount?: number;
}


