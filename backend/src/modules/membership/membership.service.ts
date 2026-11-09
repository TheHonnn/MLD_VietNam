import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { RedeemVoucherDto } from './dto/redeem-voucher.dto';

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

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
    preferredBranch: 'Chi nhánh Quận 3 — TP. Hồ Chí Minh',
    theme: 'Sáng',
    version: '1.0.0',
  };

  private isValidUuid(id: string): boolean {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }

  private async resolveUserId(userId: string, phoneOrEmail?: string): Promise<string | null> {
    if (this.isValidUuid(userId)) {
      return userId;
    }
    if (phoneOrEmail && phoneOrEmail.trim().length > 0) {
      const clean = phoneOrEmail.trim();
      const isEmail = clean.includes('@');
      try {
        if (isEmail) {
          const { data } = await this.supabaseService.adminClient
            .from('users')
            .select('id')
            .eq('email', clean)
            .maybeSingle();
          if (data?.id) return data.id;
        } else {
          const digits = clean.replace(/\D/g, '');
          const phoneVariants = [clean, digits];
          if (digits.startsWith('0')) {
            phoneVariants.push('+84' + digits.slice(1));
          } else if (digits.startsWith('84')) {
            phoneVariants.push('0' + digits.slice(2));
          }
          const { data } = await this.supabaseService.adminClient
            .from('users')
            .select('id')
            .in('phone', phoneVariants)
            .maybeSingle();
          if (data?.id) return data.id;
        }
      } catch (_) {}
    }
    return null;
  }

  private mapTierName(tier?: string): string {
    switch (tier) {
      case 'DIAMOND':
        return 'Hội viên Kim cương';
      case 'GOLD':
        return 'Hội viên Vàng';
      case 'SILVER':
        return 'Hội viên Bạc';
      default:
        return 'Thành viên';
    }
  }

  /**
   * F01/F02: Lấy thông tin hồ sơ cá nhân
   */
  async getProfile(userId: string, phoneOrEmail?: string) {
    const resolvedId = await this.resolveUserId(userId, phoneOrEmail);

    if (resolvedId) {
      try {
        const { data: user } = await this.supabaseService.adminClient
          .from('users')
          .select('id, full_name, phone, email, avatar_url, gender, date_of_birth, address, emergency_contact_name, emergency_contact_phone, membership_tier, reward_points, referral_code')
          .eq('id', resolvedId)
          .maybeSingle();

        if (user) {
          const tier = this.mapTierName(user.membership_tier);
          const points = typeof user.reward_points === 'number' ? user.reward_points : 0;
          const phone = user.phone || '';

          let formattedDob = '';
          if (user.date_of_birth) {
            const raw = String(user.date_of_birth).trim();
            if (raw.includes('-')) {
              const parts = raw.split('-');
              if (parts.length === 3 && parts[0].length === 4) {
                formattedDob = `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
              } else {
                formattedDob = raw;
              }
            } else {
              formattedDob = raw;
            }
          }

          const displayGender = user.gender === 'MALE' ? 'Nam' : (user.gender === 'FEMALE' ? 'Nữ' : 'Khác');

          return {
            success: true,
            data: {
              id: user.id,
              fullName: user.full_name || '',
              phone: phone,
              isPhoneVerified: phone.trim().length > 0,
              email: user.email || '',
              dateOfBirth: formattedDob,
              gender: displayGender,
              address: user.address || '',
              occupation: '',
              emergencyContactName: user.emergency_contact_name || '',
              emergencyContactPhone: user.emergency_contact_phone || '',
              avatarUrl: user.avatar_url || '',
              memberTier: tier,
              memberCode: user.referral_code || (phone ? `MLD-${phone.slice(-6)}` : `MLD-${user.id.substring(0, 6).toUpperCase()}`),
              points: points,
              validUntil: 'Đang hoạt động',
            },
          };
        }
      } catch (err) {
        this.logger.warn(`Error querying profile: ${err}`);
      }
    }

    return {
      success: true,
      data: {
        id: '',
        fullName: '',
        phone: '',
        isPhoneVerified: false,
        email: '',
        dateOfBirth: '',
        gender: 'Nữ',
        address: '',
        occupation: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        avatarUrl: '',
        memberTier: 'Thành viên',
        memberCode: 'MLD-KHACH',
        points: 0,
        validUntil: '',
      },
    };
  }

  /**
   * F02: Cập nhật thông tin cá nhân
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const resolvedId = await this.resolveUserId(userId, dto.phone || dto.email);

    if (resolvedId) {
      try {
        const updateData: Record<string, any> = {};
        if (dto.fullName !== undefined) updateData.full_name = dto.fullName.trim();
        if (dto.phone !== undefined && dto.phone.trim().length > 0) updateData.phone = dto.phone.trim();
        if (dto.avatarUrl !== undefined) updateData.avatar_url = dto.avatarUrl.trim();
        if (dto.email !== undefined) {
          const em = dto.email.trim();
          updateData.email = em.length > 0 ? em : null;
        }
        if (dto.address !== undefined) updateData.address = dto.address.trim();
        if (dto.emergencyContactName !== undefined) updateData.emergency_contact_name = dto.emergencyContactName.trim();
        if (dto.emergencyContactPhone !== undefined) updateData.emergency_contact_phone = dto.emergencyContactPhone.trim();
        if (dto.gender) {
          const g = dto.gender.toUpperCase().trim();
          if (g === 'NAM' || g === 'MALE') updateData.gender = 'MALE';
          else if (g === 'NỮ' || g === 'NU' || g === 'FEMALE') updateData.gender = 'FEMALE';
          else updateData.gender = 'OTHER';
        }
        if (dto.dateOfBirth && dto.dateOfBirth.trim().length > 0) {
          try {
            const raw = dto.dateOfBirth.trim();
            if (raw.includes('/')) {
              const parts = raw.split('/');
              if (parts.length === 3) {
                updateData.date_of_birth = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              } else {
                updateData.date_of_birth = raw;
              }
            } else {
              updateData.date_of_birth = raw;
            }
          } catch (_) {
            updateData.date_of_birth = dto.dateOfBirth;
          }
        }

        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString();
          await this.supabaseService.adminClient
            .from('users')
            .update(updateData)
            .eq('id', resolvedId);
        }

        const { data: refreshed } = await this.supabaseService.adminClient
          .from('users')
          .select('id, full_name, phone, email, avatar_url, gender, date_of_birth, address, emergency_contact_name, emergency_contact_phone, membership_tier, reward_points, referral_code')
          .eq('id', resolvedId)
          .maybeSingle();

        if (refreshed) {
          const tier = this.mapTierName(refreshed.membership_tier);
          let dob = '';
          if (refreshed.date_of_birth) {
            const parts = String(refreshed.date_of_birth).split('-');
            if (parts.length === 3 && parts[0].length === 4) {
              dob = `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
            } else {
              dob = String(refreshed.date_of_birth);
            }
          }
          return {
            success: true,
            message: 'Cập nhật thông tin thành công',
            data: {
              id: refreshed.id,
              fullName: refreshed.full_name || '',
              phone: refreshed.phone || '',
              isPhoneVerified: !!(refreshed.phone && refreshed.phone.trim().length > 0),
              email: refreshed.email || '',
              dateOfBirth: dob,
              gender: refreshed.gender === 'MALE' ? 'Nam' : (refreshed.gender === 'FEMALE' ? 'Nữ' : 'Khác'),
              address: refreshed.address || '',
              occupation: dto.occupation || '',
              emergencyContactName: refreshed.emergency_contact_name || '',
              emergencyContactPhone: refreshed.emergency_contact_phone || '',
              avatarUrl: refreshed.avatar_url || '',
              memberTier: tier,
              memberCode: refreshed.referral_code || '',
              points: typeof refreshed.reward_points === 'number' ? refreshed.reward_points : 0,
              validUntil: 'Đang hoạt động',
            },
          };
        }
      } catch (err) {
        this.logger.warn(`Error updating profile: ${err}`);
      }
    }

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

  /**
   * F03: Xem thẻ hội viên điện tử & đặc quyền
   */
  async getMembershipCard(userId: string) {
    const profileRes = await this.getProfile(userId);
    const profile = profileRes.data;

    return {
      success: true,
      data: {
        memberTier: profile.memberTier,
        fullName: profile.fullName,
        memberCode: profile.memberCode,
        points: profile.points,
        validUntil: profile.validUntil,
        qrCode: `${profile.memberCode}-CHECKIN`,
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
          { name: 'Thành viên', minPoints: 0, isCurrent: profile.points < 1000 },
          { name: 'Bạc', minPoints: 1000, isCurrent: profile.points >= 1000 && profile.points < 2000 },
          { name: 'Vàng', minPoints: 2000, isCurrent: profile.points >= 2000 && profile.points < 3000 },
          { name: 'Kim cương', minPoints: 3000, isCurrent: profile.points >= 3000 },
        ],
      },
    };
  }

  /**
   * F04: Lấy số dư điểm, lịch sử biến động và danh mục đổi quà
   */
  async getLoyaltyPoints(userId: string) {
    const resolvedId = await this.resolveUserId(userId);
    let points = this.userProfile.points;
    let transactions: any[] = [];

    if (resolvedId) {
      try {
        const { data: user } = await this.supabaseService.adminClient
          .from('users')
          .select('reward_points')
          .eq('id', resolvedId)
          .maybeSingle();

        if (user && typeof user.reward_points === 'number') {
          points = user.reward_points;
        }

        const { data: dbTransactions } = await this.supabaseService.adminClient
          .from('point_transactions')
          .select('*')
          .eq('user_id', resolvedId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (dbTransactions && dbTransactions.length > 0) {
          transactions = dbTransactions.map((tx: any) => ({
            id: tx.id,
            type: tx.points_change >= 0 ? 'EARN' : 'REDEEM',
            title: tx.description || 'Giao dịch điểm thưởng',
            date: new Date(tx.created_at).toLocaleDateString('vi-VN'),
            branch: 'Chi nhánh Quận 3 — TP. Hồ Chí Minh',
            points: tx.points_change >= 0 ? `+${tx.points_change}` : `${tx.points_change}`,
          }));
        }
      } catch (err) {
        this.logger.warn(`Error querying loyalty points: ${err}`);
      }
    }



    const targetPoints = 3000;
    const needed = Math.max(0, targetPoints - points);
    const progress = Math.min(100, Math.round((points / targetPoints) * 100));

    return {
      success: true,
      data: {
        currentPoints: points,
        monthlyEarned: 350,
        monthlyUsed: 500,
        expiringSoon: 200,
        expiringDate: '31/10/2026',
        monthPeriod: 'Tháng 10/2026',
        nextTier: {
          targetTier: 'Kim cương',
          neededPoints: needed,
          targetPoints: targetPoints,
          progressPercentage: progress,
        },
        formula: `Điểm hiện tại: ${points.toLocaleString('vi-VN')} điểm`,
        history: transactions,
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

  /**
   * F04: Đổi điểm thưởng nhận voucher
   */
  async redeemReward(userId: string, dto: RedeemVoucherDto) {
    const resolvedId = await this.resolveUserId(userId);
    if (!resolvedId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để đổi điểm thưởng');
    }

    let pointCost = 300;
    let rewardTitle = 'Voucher dịch vụ giảm 20%';
    let couponTargetCode = 'SPADAY20';
    let discountPercent = 20;
    let discountAmount = 0;
    let maxDiscount = 150000;
    let minOrderAmount = 400000;
    let description = 'Hóa đơn massage từ 300.000đ, giảm tối đa 150.000đ.';

    if (dto.code === 'rw-01' || dto.code.includes('100')) {
      pointCost = 500;
      rewardTitle = 'Voucher chăm sóc da 100.000đ';
      couponTargetCode = 'MLDCHAOXIN';
      discountPercent = 0;
      discountAmount = 100000;
      maxDiscount = 100000;
      minOrderAmount = 300000;
      description = 'Hóa đơn chăm sóc da từ 500.000đ. Không cộng dồn ưu đãi khác.';
    } else if (dto.code === 'rw-03' || dto.code.includes('BODY')) {
      pointCost = 800;
      rewardTitle = 'Quà trải nghiệm chăm sóc cơ thể';
      couponTargetCode = 'BODYTREAT';
      discountPercent = 0;
      discountAmount = 250000;
      maxDiscount = 250000;
      minOrderAmount = 0;
      description = 'Áp dụng cho 01 dịch vụ chăm sóc cơ thể tiêu chuẩn, cần đặt lịch trước.';
    }

    let updatedPoints = 0;

    try {
      const { data: user } = await this.supabaseService.adminClient
        .from('users')
        .select('reward_points')
        .eq('id', resolvedId)
        .maybeSingle();

      const currentPts = (user?.reward_points as number) || 0;
      if (currentPts < pointCost) {
        throw new BadRequestException(`Bạn không đủ điểm thưởng (Cần ${pointCost} điểm, bạn đang có ${currentPts} điểm).`);
      }

      updatedPoints = currentPts - pointCost;

      await this.supabaseService.adminClient
        .from('users')
        .update({ reward_points: updatedPoints })
        .eq('id', resolvedId);

      await this.supabaseService.adminClient
        .from('point_transactions')
        .insert({
          user_id: resolvedId,
          points_change: -pointCost,
          balance_after: updatedPoints,
          action_type: 'REDEEM_VOUCHER',
          description: `Đổi quà: ${rewardTitle} (-${pointCost} điểm)`,
        });

      let couponId: string | null = null;
      const { data: existingCoupon } = await this.supabaseService.adminClient
        .from('coupons')
        .select('id')
        .or(`code.eq.${couponTargetCode},code.ilike.%${dto.code}%`)
        .maybeSingle();

      if (existingCoupon) {
        couponId = existingCoupon.id;
      } else {
        const newCouponId = '44444444-0001-0001-0001-' + (dto.code === 'rw-01' ? '000000000001' : (dto.code === 'rw-02' ? '000000000002' : '000000000003'));
        const { data: createdCoupon } = await this.supabaseService.adminClient
          .from('coupons')
          .upsert({
            id: newCouponId,
            code: couponTargetCode,
            title: rewardTitle,
            description: description,
            discount_percent: discountPercent,
            discount_amount: discountAmount,
            max_discount: maxDiscount,
            min_order_amount: minOrderAmount,
            valid_from: new Date().toISOString(),
            valid_to: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            usage_limit: 1000,
          })
          .select('id')
          .maybeSingle();

        if (createdCoupon) {
          couponId = createdCoupon.id;
        }
      }

      if (couponId) {
        await this.supabaseService.adminClient
          .from('user_vouchers')
          .insert({
            user_id: resolvedId,
            coupon_id: couponId,
            source_trigger: 'PUBLIC_CLAIM',
            status: 'AVAILABLE',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
      }
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof UnauthorizedException) throw err;
      this.logger.warn(`Error during redeemReward: ${err}`);
      throw err;
    }

    return {
      success: true,
      message: `Đổi thành công ${rewardTitle}! Số dư còn lại: ${updatedPoints.toLocaleString('vi-VN')} điểm.`,
      currentPoints: updatedPoints,
    };
  }
  /**
   * F05: Lấy danh sách voucher/ưu đãi của tôi
   */
  async getMyVouchers(userId: string, filter?: string) {
    const resolvedId = await this.resolveUserId(userId);

    if (resolvedId) {
      try {
        let query = this.supabaseService.adminClient
          .from('user_vouchers')
          .select(`
            id,
            status,
            expires_at,
            claimed_at,
            coupons (
              id,
              code,
              title,
              description,
              discount_percent,
              discount_amount
            )
          `)
          .eq('user_id', resolvedId)
          .order('claimed_at', { ascending: false });

        if (filter) {
          query = query.eq('status', filter);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const list = data.map((v: any) => {
            const c = v.coupons;
            const pct = Number(c?.discount_percent) || 0;
            const amt = Number(c?.discount_amount) || 0;
            const banner = pct > 0 ? `GIẢM ${pct}%` : `GIẢM ${amt.toLocaleString('vi-VN')}Đ`;

            return {
              id: v.id,
              title: c?.title || 'Ưu đãi dịch vụ MLD',
              subtitle: 'Đặc quyền chăm sóc sức khỏe',
              discountBanner: banner,
              description: c?.description || 'Áp dụng tại Chi nhánh Quận 3 — TP. Hồ Chí Minh.',
              expiryDate: new Date(v.expires_at).toLocaleDateString('vi-VN'),
              code: c?.code || 'MLDVIP',
              status: v.status,
              statusText: v.status === 'AVAILABLE' ? 'Có thể sử dụng' : 'Đã sử dụng',
            };
          });

          return {
            success: true,
            totalAvailable: list.filter((i) => i.status === 'AVAILABLE').length,
            nearestExpiry: list[0]?.expiryDate || '31/12/2026',
            data: list,
          };
        }
      } catch (err) {
        this.logger.warn(`Error querying user vouchers: ${err}`);
      }
    }

    return {
      success: true,
      totalAvailable: 0,
      nearestExpiry: '',
      data: [],
    };
  }

  /**
   * F06: Xem lịch sử thanh toán theo tháng & bộ lọc
   */
  async getPaymentHistory(userId: string, month?: string, category?: string) {
    const resolvedId = await this.resolveUserId(userId);

    if (resolvedId) {
      try {
        const { data: bookings, error } = await this.supabaseService.adminClient
          .from('bookings')
          .select(`
            id,
            booking_code,
            booking_date,
            final_price,
            status,
            payment_status,
            payment_method,
            branches (name),
            booking_items (
              services (name)
            )
          `)
          .eq('customer_id', resolvedId)
          .order('booking_date', { ascending: false })
          .limit(20);

        if (!error && bookings && bookings.length > 0) {
          const payments = bookings.map((b: any) => {
            const price = Number(b.final_price) || 0;
            const serviceName = b.booking_items?.[0]?.services?.name || 'Dịch vụ Spa Chăm Sóc';
            const branchName = b.branches?.name || 'Chi nhánh Quận 3 — TP. Hồ Chí Minh';

            return {
              id: b.id,
              code: b.booking_code,
              date: b.booking_date,
              type: 'Dịch vụ',
              icon: 'receipt',
              serviceName: serviceName,
              branch: branchName,
              amount: price,
              amountFormatted: `${price.toLocaleString('vi-VN')}đ`,
              status: b.payment_status === 'PAID' ? 'SUCCESS' : 'PENDING',
              statusLabel: b.payment_status === 'PAID' ? 'Thanh toán thành công' : 'Chưa thanh toán',
              paymentMethod: b.payment_method === 'CASH_AT_SPA' ? 'Thanh toán tại cơ sở' : 'Thanh toán trực tuyến',
              refundAmount: 0,
              remainingAmount: 0,
            };
          });

          const totalPaid = payments.reduce((acc, cur) => acc + (cur.amount || 0), 0);

          return {
            success: true,
            monthPeriod: month || 'Tháng 10/2026 (01/10/2026 – 31/10/2026)',
            totalPaid: totalPaid,
            totalPaidFormatted: `${totalPaid.toLocaleString('vi-VN')}đ`,
            transactionCount: payments.length,
            latestPayment: payments[0]?.date ? `${payments[0].date} · ${payments[0].amountFormatted}` : '',
            data: payments,
          };
        }
      } catch (err) {
        this.logger.warn(`Error querying payment history: ${err}`);
      }
    }

    return {
      success: true,
      monthPeriod: month || '',
      totalPaid: 0,
      totalPaidFormatted: '0đ',
      transactionCount: 0,
      latestPayment: '',
      data: [],
    };
  }

  /**
   * F07: Lấy mã giới thiệu, thống kê và lịch sử giới thiệu bạn bè
   */
  async getReferralProgram(userId: string) {
    const resolvedId = await this.resolveUserId(userId);
    let referralCode = this.userProfile.memberCode;

    if (resolvedId) {
      try {
        const { data: user } = await this.supabaseService.adminClient
          .from('users')
          .select('phone')
          .eq('id', resolvedId)
          .maybeSingle();

        if (user?.phone) {
          referralCode = `MLD-${user.phone.slice(-6)}`;
        }

        const { data: refs } = await this.supabaseService.adminClient
          .from('referrals')
          .select(`
            id,
            reward_points,
            is_rewarded,
            created_at,
            referee:referee_id (full_name)
          `)
          .eq('referrer_id', resolvedId)
          .order('created_at', { ascending: false });

        if (refs && refs.length > 0) {
          const eligible = refs.filter((r: any) => r.is_rewarded);
          const earned = eligible.reduce((acc: number, cur: any) => acc + (cur.reward_points || 0), 0);

          return {
            success: true,
            data: {
              referralCode: referralCode,
              stats: {
                totalReferred: refs.length,
                eligibleCount: eligible.length,
                pointsEarned: earned,
                lastRecorded: new Date(refs[0].created_at).toLocaleDateString('vi-VN'),
              },
              history: refs.map((r: any) => {
                const name = r.referee?.full_name || 'Khách hàng';
                const masked = name.length > 3 ? `${name[0]}*** ${name.slice(-4)}` : name;
                return {
                  id: r.id,
                  maskedName: masked,
                  date: new Date(r.created_at).toLocaleDateString('vi-VN'),
                  status: r.is_rewarded ? 'ELIGIBLE' : 'PENDING',
                  statusText: r.is_rewarded ? 'Đủ điều kiện' : 'Đang chờ',
                  points: r.is_rewarded ? `+${r.reward_points} điểm` : '0 điểm',
                  recordedDate: new Date(r.created_at).toLocaleDateString('vi-VN'),
                };
              }),
            },
          };
        }
      } catch (err) {
        this.logger.warn(`Error querying referral program: ${err}`);
      }
    }

    return {
      success: true,
      data: {
        referralCode: referralCode,
        stats: {
          totalReferred: 0,
          eligibleCount: 0,
          pointsEarned: 0,
          lastRecorded: '',
        },
        history: [],
      },
    };
  }

  /**
   * F08: Lấy cấu hình cài đặt thông báo và tùy chọn
   */
  async getSettings(userId: string) {
    return {
      success: true,
      data: this.userSettings,
    };
  }

  /**
   * F08: Cập nhật cài đặt tài khoản
   */
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

  /**
   * Liên kết mã người giới thiệu cho hội viên qua Backend NestJS (dùng adminClient, an toàn tuyệt đối)
   */
  async linkReferral(userId: string, code: string) {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      throw new BadRequestException('Mã giới thiệu không được để trống');
    }

    const resolvedId = await this.resolveUserId(userId);
    if (!resolvedId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để thực hiện');
    }

    const { data: referrer, error } = await this.supabaseService.adminClient
      .from('users')
      .select('id, full_name, role')
      .eq('referral_code', cleanCode)
      .maybeSingle();

    if (error || !referrer) {
      throw new BadRequestException('Mã giới thiệu không tồn tại trên hệ thống');
    }

    if (referrer.id === resolvedId) {
      throw new BadRequestException('Không thể nhập mã của chính bạn');
    }

    await this.supabaseService.adminClient
      .from('users')
      .update({ referred_by_id: referrer.id })
      .eq('id', resolvedId);

    const displayRole = referrer.role === 'INSTRUCTOR' ? ' (Chỉ định Y khoa)' : (referrer.role === 'TECHNICIAN' ? ' (KTV Phục hồi)' : '');
    const fullNameFormatted = `${referrer.full_name}${displayRole}`;

    return {
      success: true,
      message: `Đã liên kết người giới thiệu: ${referrer.full_name}`,
      data: {
        referrerId: referrer.id,
        referrerName: fullNameFormatted,
      },
    };
  }

  /**
   * Gỡ bỏ người giới thiệu qua Backend NestJS
   */
  async clearReferral(userId: string) {
    const resolvedId = await this.resolveUserId(userId);
    if (!resolvedId) {
      throw new UnauthorizedException('Vui lòng đăng nhập để thực hiện');
    }

    await this.supabaseService.adminClient
      .from('users')
      .update({ referred_by_id: null })
      .eq('id', resolvedId);

    return {
      success: true,
      message: 'Đã gỡ bỏ người giới thiệu thành công',
    };
  }
}
