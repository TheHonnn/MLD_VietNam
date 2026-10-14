import { Injectable } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { RedeemVoucherDto } from './dto/redeem-voucher.dto';

@Injectable()
export class MembershipService {
  private userProfile = {
    id: 'user-000128',
    fullName: 'Nguyễn Minh Anh',
    phone: '0912 345 678',
    isPhoneVerified: true,
    email: 'minh.anh@example.com',
    dateOfBirth: '15/08/1998',
    gender: 'Nữ',
    address: '12 Đường Mẫu, Phường Mẫu, TP. Hồ Chí Minh',
    occupation: 'Nhân viên văn phòng',
    emergencyContactName: 'Nguyễn Văn B',
    emergencyContactPhone: '0901 234 567',
    avatarUrl: 'assets/images/le_hoai_an.png',
    memberTier: 'Hội viên Vàng',
    memberCode: 'WM-000128',
    points: 2450,
    validUntil: '31/12/2026',
  };

  private userSettings = {
    notifyAppointments: true,
    notifyTreatments: true,
    notifyCourses: true,
    notifyPromotions: false,
    language: 'Tiếng Việt',
    preferredBranch: 'Chi nhánh mẫu 01 — Quận 3',
    theme: 'Sáng',
    version: '1.0.0 — Demo',
  };

  async getProfile(userId: string) {
    return {
      success: true,
      data: this.userProfile,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    this.userProfile = {
      ...this.userProfile,
      ...dto,
    };
    return {
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: this.userProfile,
    };
  }

  async getMembershipCard(userId: string) {
    return {
      success: true,
      data: {
        memberTier: this.userProfile.memberTier,
        fullName: this.userProfile.fullName,
        memberCode: this.userProfile.memberCode,
        points: this.userProfile.points,
        validUntil: this.userProfile.validUntil,
        qrCode: 'WM-000128-DEMO-CHECKIN',
        perks: [
          {
            icon: 'badge-percent',
            title: 'Ưu đãi dịch vụ 10%',
            description: 'Giảm trực tiếp 10% cho mọi dịch vụ chăm sóc da và trị liệu tại tất cả chi nhánh.',
          },
          {
            icon: 'sparkles',
            title: 'Nhân 1.5x điểm tích lũy',
            description: 'Nhân 1.5 lần điểm thưởng cho tất cả các giao dịch phát sinh trong tháng sinh nhật.',
          },
          {
            icon: 'gift',
            title: 'Quà tri ân thường niên',
            description: 'Nhận bộ quà tặng cao cấp MLD phiên bản giới hạn nhân dịp kỷ niệm hội viên.',
          },
          {
            icon: 'crown',
            title: 'Ưu tiên đặt lịch & chọn chuyên viên',
            description: 'Giữ chỗ ưu tiên trong khung giờ cao điểm và được chỉ định kỹ thuật viên trưởng.',
          },
        ],
        tiers: [
          { name: 'Thành viên', minPoints: 0, isCurrent: false },
          { name: 'Bạc', minPoints: 1000, isCurrent: false },
          { name: 'Vàng', minPoints: 2000, isCurrent: true },
          { name: 'Kim cương', minPoints: 3000, isCurrent: false },
        ],
      },
    };
  }

  async getLoyaltyPoints(userId: string) {
    return {
      success: true,
      data: {
        currentPoints: this.userProfile.points,
        monthlyEarned: 350,
        monthlyUsed: 500,
        expiringSoon: 200,
        expiringDate: '31/10/2026',
        monthPeriod: 'Tháng 10/2026',
        nextTier: {
          targetTier: 'Kim cương',
          neededPoints: 550,
          targetPoints: 3000,
          progressPercentage: 81.7,
        },
        formula: 'Đầu kỳ 01/10/2026: 2.600 điểm (2.600 + 350 − 500 = 2.450 điểm)',
        history: [
          {
            id: 'pt-01',
            type: 'EARN',
            title: 'Massage thư giãn toàn thân',
            date: '08/10/2026',
            branch: 'Chi nhánh mẫu 01 — Quận 3',
            points: '+150',
          },
          {
            id: 'pt-02',
            type: 'REDEEM',
            title: 'Đổi voucher chăm sóc da 100.000đ',
            date: '05/10/2026',
            branch: 'Ứng dụng di động',
            points: '−500',
          },
          {
            id: 'pt-03',
            type: 'EARN',
            title: 'Giới thiệu bạn bè thành công',
            date: '03/10/2026',
            branch: 'Chương trình giới thiệu',
            points: '+200',
          },
        ],
        rewards: [
          {
            id: 'rw-01',
            title: 'Voucher chăm sóc da 100.000đ',
            pointsRequired: 500,
            condition: 'Hóa đơn chăm sóc da từ 500.000đ. Không cộng dồn ưu đãi khác.',
          },
          {
            id: 'rw-02',
            title: 'Voucher dịch vụ giảm 20%',
            pointsRequired: 300,
            condition: 'Hóa đơn massage từ 300.000đ, giảm tối đa 150.000đ.',
          },
          {
            id: 'rw-03',
            title: 'Quà trải nghiệm chăm sóc cơ thể',
            pointsRequired: 800,
            condition: 'Áp dụng cho 01 dịch vụ chăm sóc cơ thể tiêu chuẩn, cần đặt lịch trước.',
          },
        ],
      },
    };
  }

  async getMyVouchers(userId: string, filter?: string) {
    const vouchers = [
      {
        id: 'vc-01',
        title: 'Ưu đãi dịch vụ massage',
        subtitle: 'Dành thời gian thư giãn và chăm sóc bản thân.',
        discountBanner: 'GIẢM 20%',
        description:
          'Hóa đơn massage từ 300.000đ; giảm tối đa 150.000đ. Chi nhánh mẫu 01 — Quận 3. Không cộng dồn ưu đãi khác. Điều kiện minh họa.',
        expiryDate: '31/12/2026',
        code: 'MASSAGE20DEMO',
        status: 'AVAILABLE',
        statusText: 'Có thể sử dụng · Dữ liệu minh họa',
      },
      {
        id: 'vc-02',
        title: 'Áp dụng cho dịch vụ chăm sóc da',
        subtitle: 'Một đặc quyền nhỏ cho làn da được nâng niu.',
        discountBanner: 'GIẢM 100.000Đ',
        description:
          'Hóa đơn chăm sóc da từ 500.000đ. Áp dụng tại Chi nhánh mẫu 01 — Quận 3. Áp dụng theo điều kiện minh họa.',
        expiryDate: '15/11/2026',
        code: 'DA100DEMO',
        status: 'AVAILABLE',
        statusText: 'Có thể sử dụng · Dữ liệu minh họa',
      },
      {
        id: 'vc-03',
        title: 'Trải nghiệm chăm sóc cơ thể',
        subtitle: 'Áp dụng theo điều kiện chương trình',
        discountBanner: 'TẶNG 01 BUỔI',
        description:
          'Dành cho trải nghiệm mới của dịch vụ cơ thể đủ điều kiện. Cần đặt lịch hẹn trước ít nhất 24 giờ.',
        expiryDate: '31/10/2026',
        code: 'BODY01DEMO',
        status: 'AVAILABLE',
        statusText: 'Có thể sử dụng · Dữ liệu minh họa',
      },
    ];

    return {
      success: true,
      totalAvailable: 3,
      nearestExpiry: '31/10/2026',
      data: vouchers,
    };
  }

  async getPaymentHistory(userId: string, month?: string, category?: string) {
    const payments = [
      {
        id: 'pay-01',
        code: 'MH-DV-1008 · Minh họa',
        date: '08/10/2026',
        type: 'Dịch vụ',
        icon: 'receipt',
        serviceName: 'Massage thư giãn toàn thân',
        branch: 'Chi nhánh mẫu 01 — Quận 3',
        amount: 450000,
        amountFormatted: '450.000đ',
        status: 'SUCCESS',
        statusLabel: 'Thanh toán thành công (mô phỏng)',
        paymentMethod: 'Thanh toán tại cơ sở',
        refundAmount: 0,
        remainingAmount: 0,
      },
      {
        id: 'pay-02',
        code: 'MH-LT-1005 · Minh họa',
        date: '05/10/2026',
        type: 'Liệu trình',
        icon: 'receipt',
        serviceName: 'Gói chăm sóc da 8 buổi',
        branch: 'Chi nhánh mẫu 01 — Quận 3',
        amount: 3600000,
        amountFormatted: '3.600.000đ',
        status: 'SUCCESS',
        statusLabel: 'Thanh toán thành công (mô phỏng)',
        paymentMethod: 'Thanh toán trực tuyến',
        refundAmount: 0,
        remainingAmount: 0,
      },
      {
        id: 'pay-03',
        code: 'MH-HP-1001 · Minh họa',
        date: '01/10/2026',
        type: 'Học phí',
        icon: 'graduation-cap',
        serviceName: 'Học phí khóa Kỹ thuật Spa Cơ bản',
        branch: 'Học viện · Chi nhánh mẫu 01 — Quận 3',
        amount: 4500000,
        amountFormatted: '4.500.000đ',
        status: 'SUCCESS',
        statusLabel: 'Thanh toán thành công (mô phỏng)',
        paymentMethod: 'Chuyển khoản',
        refundAmount: 0,
        remainingAmount: 0,
      },
    ];

    return {
      success: true,
      monthPeriod: 'Tháng 10/2026 (01/10/2026 – 31/10/2026)',
      totalPaid: 8550000,
      totalPaidFormatted: '8.550.000đ',
      transactionCount: 3,
      latestPayment: '08/10/2026 · 450.000đ',
      data: payments,
    };
  }

  async getReferralProgram(userId: string) {
    return {
      success: true,
      data: {
        referralCode: 'MINHANH128',
        stats: {
          totalReferred: 3,
          eligibleCount: 2,
          pointsEarned: 200,
          lastRecorded: '03/10/2026',
        },
        history: [
          {
            id: 'ref-01',
            maskedName: 'N*** Linh',
            date: '02/10/2026',
            status: 'ELIGIBLE',
            statusText: 'Đủ điều kiện',
            points: '+100 điểm',
            recordedDate: '03/10/2026',
          },
          {
            id: 'ref-02',
            maskedName: 'Tr*** Ngọc',
            date: '03/10/2026',
            status: 'ELIGIBLE',
            statusText: 'Đủ điều kiện',
            points: '+100 điểm',
            recordedDate: '03/10/2026',
          },
          {
            id: 'ref-03',
            maskedName: 'Ph*** Hà',
            date: '08/10/2026',
            status: 'PENDING',
            statusText: 'Đang chờ',
            points: '0 điểm',
            recordedDate: 'Chưa đủ điều kiện · Chưa ghi nhận điểm',
          },
        ],
      },
    };
  }

  async getSettings(userId: string) {
    return {
      success: true,
      data: this.userSettings,
    };
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    this.userSettings = {
      ...this.userSettings,
      ...dto,
    };
    return {
      success: true,
      message: 'Cập nhật cài đặt thành công',
      data: this.userSettings,
    };
  }

  async redeemReward(userId: string, dto: RedeemVoucherDto) {
    return {
      success: true,
      message: `Đổi thành công phần thưởng ${dto.code}. Điểm đã được cập nhật!`,
      currentPoints: this.userProfile.points,
    };
  }
}

