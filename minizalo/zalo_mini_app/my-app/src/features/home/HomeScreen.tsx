import React, { useEffect, useState } from 'react';
import type { User, MedicalService, Branch, Doctor, Course } from '../../../../../backend/src/data/database';
import {
  BellIcon,
  SearchIcon,
  MapIcon,
  NavAcademyIcon,
  NavProfileIcon,
  NavServiceIcon,
  BookOpenIcon,
  ChatBubbleIcon,
} from '@/components/Icons';
import { MobileHomeHero } from '@/components/MobileHomeHero';
import type { PortalBanner } from '@/components/PortalBanners';
import { EntityImage, MapLink } from '@/components/GroupBExtensions';
import { DualFilterBar, type DualFilterSide } from '@/components/DualFilterBar';
import { trainingMetadata } from '@/utils/training-metadata';
import { branchOpenNow } from '@/utils/branch-hours';
import { contactPhone } from '@/utils/phone';
import logo from '@/static/logo-admin.png';
import '@/css/mobile-home-matched.scss';
import '@/css/customer-catalog.scss';

export type HomeCourseFilter = { targetAudience: string; targetNeed: string };
export type HomeServiceFilter = { branchId: string; serviceId: string };

export function HomeScreen({
  user,
  services,
  branches,
  courses,
  banners,
  activeBranchId,
  onNavigate,
  onSearch,
  onService,
  onBook,
  onCourseSearch,
  onServiceSearch,
  onConsultation,
  unread,
}: {
  user: User | null;
  services: MedicalService[];
  branches: Branch[];
  doctors: Doctor[];
  courses: Course[];
  banners: PortalBanner[];
  activeBranchId: string;
  onBranch: (id: string) => void;
  onNavigate: (view: string) => void;
  onSearch: () => void;
  onService: (item: MedicalService) => void;
  onCourse: (item: Course) => void;
  onSpecialist: (item: Doctor) => void;
  onBook: (item: MedicalService) => void;
  onCourseSearch: (filter: HomeCourseFilter) => void;
  onServiceSearch: (filter: HomeServiceFilter) => void;
  onConsultation: (name?: string, phone?: string) => void;
  unread: number;
}) {
  const featured = services.find((s) => (s as any).isFeatured) || services[0];
  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const [tab, setTab] = useState<'course' | 'service'>('course');
  const [expandedFilter, setExpandedFilter] = useState<DualFilterSide | null>(null);
  const [audience, setAudience] = useState('');
  const [need, setNeed] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [branchId, setBranchId] = useState(activeBranchId);
  const [quickQuery, setQuickQuery] = useState('');
  const [socialExpanded, setSocialExpanded] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => setBranchId(activeBranchId), [activeBranchId]);

  const audiences = [...new Set(courses.map((c) => trainingMetadata(c).targetAudience).filter(Boolean))];
  const needs = [...new Set(courses.map((c) => trainingMetadata(c).targetNeed).filter(Boolean))];
  const callPhone = contactPhone(activeBranch?.phone || '') || '';
  const open = branchOpenNow(activeBranch?.openingTime, activeBranch?.closingTime, now);

  const channels = [
    { title: 'Zalo', subtitle: 'Phản hồi nhanh', url: 'https://zalo.me/1424469774232439257?src=qr', mark: 'Zalo', kind: 'zalo' },
    { title: 'Facebook', subtitle: 'Theo dõi chúng tôi', url: 'https://www.facebook.com/hebachhuyet.mldvietnam', mark: 'f', kind: 'facebook' },
    { title: 'TikTok', subtitle: 'Xem video', url: 'https://www.tiktok.com/@trungtamgiamphu', mark: '♪', kind: 'tiktok' },
    { title: 'Messenger', subtitle: 'Chat tư vấn', url: 'https://m.me/hebachhuyet.mldvietnam', mark: '⚡', kind: 'messenger' },
  ];

  const handleSearchSubmit = () => {
    if (quickQuery.trim()) {
      onSearch();
      return;
    }
    if (tab === 'course') {
      onCourseSearch({ targetAudience: audience, targetNeed: need });
    } else {
      onServiceSearch({ branchId, serviceId });
    }
  };

  return (
    <div className="matched-home">
      <header className="matched-home-header">
        <img src={logo} alt="MLD Việt Nam" />
        <div>
          <button type="button" aria-label="Thông báo" onClick={() => onNavigate('notifications')}>
            <BellIcon size={22} />
            {unread > 0 && <span className="mobile-unread">{unread}</span>}
          </button>
          <button type="button" aria-label="Tài khoản cá nhân" onClick={() => onNavigate('profile')}>
            {user?.avatar ? <img src={user.avatar} alt={user.name} /> : <NavProfileIcon size={22} />}
          </button>
        </div>
      </header>

      <MobileHomeHero
        banners={banners}
        phone={callPhone}
        onBook={featured ? () => onBook(featured) : undefined}
        onNavigate={onNavigate}
      />

      <div className="matched-home-body">
        <section className="matched-search-card">
          <div role="tablist" aria-label="Tìm kiếm nhanh">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'course'}
              onClick={() => {
                setTab('course');
                setExpandedFilter(null);
              }}
            >
              TÌM KHÓA HỌC
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'service'}
              onClick={() => {
                setTab('service');
                setExpandedFilter(null);
              }}
            >
              TÌM DỊCH VỤ & CƠ SỞ
            </button>
          </div>
          <div className="matched-search-body">
            <div className="matched-search-input-row">
              <SearchIcon size={18} />
              <input
                type="search"
                aria-label={tab === 'course' ? 'Nhập tên khóa học' : 'Tìm dịch vụ, cơ sở'}
                placeholder={tab === 'course' ? 'Nhập tên khóa học...' : 'Tìm dịch vụ, gói liệu trình...'}
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit();
                  }
                }}
              />
              <button
                type="button"
                className="matched-search-go"
                aria-label="Tìm kiếm"
                onClick={handleSearchSubmit}
              >
                →
              </button>
            </div>

            {tab === 'course' ? (
              <DualFilterBar
                leftLabel={need || 'Tất cả nhu cầu'}
                rightLabel={audience || 'Tất cả đối tượng'}
                isLeftSelected={Boolean(need)}
                isRightSelected={Boolean(audience)}
                expandedSide={expandedFilter}
                leftPanelTitle="Nhu cầu học tập"
                rightPanelTitle="Đối tượng học viên"
                leftOptions={[
                  { value: '', label: 'Tất cả nhu cầu' },
                  ...needs.map((v) => ({ value: v, label: v })),
                ]}
                rightOptions={[
                  { value: '', label: 'Tất cả đối tượng' },
                  ...audiences.map((v) => ({ value: v, label: v })),
                ]}
                selectedLeftValue={need}
                selectedRightValue={audience}
                onToggleLeft={() => setExpandedFilter((s) => (s === 'left' ? null : 'left'))}
                onToggleRight={() => setExpandedFilter((s) => (s === 'right' ? null : 'right'))}
                onSelectLeft={(val) => {
                  setNeed(val);
                  setExpandedFilter(null);
                }}
                onSelectRight={(val) => {
                  setAudience(val);
                  setExpandedFilter(null);
                }}
              />
            ) : (
              <DualFilterBar
                leftLabel={branches.find((b) => b.id === branchId)?.name || 'Tất cả cơ sở'}
                rightLabel={services.find((s) => s.id === serviceId)?.title || 'Tất cả dịch vụ'}
                isLeftSelected={Boolean(branchId)}
                isRightSelected={Boolean(serviceId)}
                expandedSide={expandedFilter}
                leftPanelTitle="Chọn cơ sở"
                rightPanelTitle="Chọn dịch vụ"
                leftOptions={[
                  { value: '', label: 'Tất cả cơ sở' },
                  ...branches.map((b) => ({ value: b.id, label: b.name })),
                ]}
                rightOptions={[
                  { value: '', label: 'Tất cả dịch vụ' },
                  ...services.map((s) => ({ value: s.id, label: s.title })),
                ]}
                selectedLeftValue={branchId}
                selectedRightValue={serviceId}
                onToggleLeft={() => setExpandedFilter((s) => (s === 'left' ? null : 'left'))}
                onToggleRight={() => setExpandedFilter((s) => (s === 'right' ? null : 'right'))}
                onSelectLeft={(val) => {
                  setBranchId(val);
                  setExpandedFilter(null);
                }}
                onSelectRight={(val) => {
                  setServiceId(val);
                  setExpandedFilter(null);
                }}
              />
            )}
          </div>
        </section>

        <section>
          <div className="matched-section-bar">
            <h2>Kết nối với chúng tôi</h2>
            <button type="button" onClick={() => setSocialExpanded((v) => !v)}>
              {socialExpanded ? 'Thu gọn' : 'Xem thêm →'}
            </button>
          </div>
          <div className="matched-social-circles">
            {channels.map((c) => (
              <a key={c.kind} href={c.url} target="_blank" rel="noopener noreferrer">
                <span className={'social-circle ' + c.kind}>{c.mark}</span>
                <small>{c.title}</small>
              </a>
            ))}
          </div>
          {socialExpanded && (
            <div className="matched-secondary-links mt-3">
              <button type="button" onClick={() => onNavigate('support')}>
                Gửi yêu cầu hỗ trợ
              </button>
              <button type="button" onClick={() => onNavigate('faq')}>
                Câu hỏi thường gặp (FAQ)
              </button>
              <button type="button" onClick={() => onConsultation()}>
                Đăng ký tư vấn ngay
              </button>
            </div>
          )}
        </section>

        <section>
          <div className="matched-section-bar">
            <h2>Truy cập nhanh</h2>
            <button type="button" onClick={onSearch}>
              Tìm kiếm →
            </button>
          </div>
          <nav className="matched-quick-access" aria-label="Truy cập nhanh">
            {[
              { id: 'services', label: 'Dịch vụ', Icon: NavServiceIcon },
              { id: 'documents', label: 'Tài liệu', Icon: BookOpenIcon },
              { id: 'academy', label: 'Đào tạo', Icon: NavAcademyIcon },
              { id: 'faq', label: 'Hỏi đáp', Icon: ChatBubbleIcon },
            ].map(({ id, label, Icon }) => (
              <button key={id} type="button" onClick={() => onNavigate(id)}>
                <span>
                  <Icon size={24} />
                </span>
                {label}
              </button>
            ))}
          </nav>
        </section>

        {featured && (
          <section className="mobile-core-service matched-core-service">
            <button type="button" onClick={() => onService(featured)}>
              <EntityImage src={featured.image} alt={featured.title} className="matched-service-photo" />
            </button>
            <div>
              <h2>{featured.title}</h2>
              <div className="matched-service-bottom">
                <span>
                  <strong>{featured.price.toLocaleString('vi-VN')} đ</strong>
                  <small>{featured.durationMinutes} phút / ca</small>
                </span>
                <button type="button" className="matched-action" onClick={() => onBook(featured)}>
                  Đặt lịch
                </button>
              </div>
            </div>
          </section>
        )}

        <nav className="home-catalog-links" aria-label="Thông tin chăm sóc">
          <button type="button" onClick={() => onNavigate('pricing')}>
            Bảng giá & gói liệu trình
          </button>
          <button type="button" onClick={() => onNavigate('home-products')}>
            Sản phẩm bổ trợ tại nhà
          </button>
        </nav>

        <section className="matched-consultation">
          <small>ĐĂNG KÝ TRONG 30 GIÂY</small>
          <h2>Đăng ký tư vấn</h2>
          <p>Để lại thông tin để cơ sở liên hệ với bạn.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onConsultation(name, phone);
            }}
          >
            <label className="mobile-field">
              Họ và tên
              <input required value={name} maxLength={150} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="mobile-field">
              Số điện thoại
              <input required type="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <button className="matched-action" type="submit">
              Đăng ký tư vấn
            </button>
          </form>
        </section>

        <section className="matched-branch">
          <div className="matched-section-bar">
            <h2>Hệ thống cơ sở</h2>
            <button type="button" onClick={() => onNavigate('branches')}>
              Xem bản đồ →
            </button>
          </div>
          {activeBranch && (
            <article>
              <button className="matched-branch-heading" onClick={() => onNavigate('branches')}>
                <MapIcon size={22} />
                <span>
                  <strong>{activeBranch.name}</strong>
                  <small>{activeBranch.address}</small>
                </span>
              </button>
              {activeBranch.openingTime && activeBranch.closingTime && (
                <p>
                  Mở cửa hôm nay: {activeBranch.openingTime}–{activeBranch.closingTime}
                </p>
              )}
              {open !== null && (
                <span role="status" className={'matched-open-status ' + (open ? 'is-open' : 'is-closed')}>
                  {open ? 'Đang mở cửa' : 'Đã đóng cửa'}
                </span>
              )}
              <MapLink branch={activeBranch} />
            </article>
          )}
        </section>

        <div className="matched-secondary-links">
          <button onClick={() => onNavigate('community')}>Cộng đồng MLD</button>
          <button onClick={() => onNavigate('specialists')}>Chuyên viên</button>
          <button onClick={() => onNavigate('examination')}>Kiểm tra phù bạch huyết</button>
        </div>
      </div>

      <footer className="matched-home-footer">
        <img src={logo} alt="MLD Việt Nam" />
        <p>MLD Việt Nam · Chăm sóc sức khỏe và đào tạo chuẩn Vodder</p>
        {callPhone && <p>Hotline: {callPhone}</p>}
        <div>
          {channels.map((c) => (
            <a key={c.kind} href={c.url} target="_blank" rel="noopener noreferrer" aria-label={c.title}>
              {c.mark}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
