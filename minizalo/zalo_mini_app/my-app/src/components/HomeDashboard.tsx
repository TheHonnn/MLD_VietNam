import React, { useEffect, useRef, useState } from 'react';
import { HomeCatalog, GroupBHomeProps } from './GroupBHome';
import { BellIcon, ChevronDownIcon, CloseIcon, DashboardIcon, NavProfileIcon, RefreshIcon, SearchIcon } from './Icons';
import { EntityImage } from './GroupBExtensions';
import '@/css/home-dashboard.scss';

interface HomeDashboardProps extends GroupBHomeProps {
  userAvatar?: string;
  selectedBranchId: string;
  onChangeBranch: (id: string) => void;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export function GroupBHome(props: HomeDashboardProps) {
  const { services, branches, userName, userAvatar, selectedBranchId, onChangeBranch,
    onNavigateTab, onOpenSearch, onOpenNotifications, unreadNotifications = 0, loading, error, onRefresh } = props;
  const [slideId, setSlideId] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const featured = services.filter(service => service.isFeatured);
  const heroServices = (featured.length ? featured : services).slice(0, 3);
  const slideIds = heroServices.map(service => service.id);
  const index = Math.max(0, slideIds.indexOf(slideId));
  const service = heroServices[index];
  const changeSlide = (offset: number) => {
    if (slideIds.length) setSlideId(slideIds[(index + offset + slideIds.length) % slideIds.length]);
  };

  useEffect(() => { setAvatarFailed(false); }, [userAvatar]);
  useEffect(() => {
    if (catalogOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [catalogOpen]);
  const closeThen = <T extends unknown[],>(callback: ((...values: T) => void) | undefined) => (...values: T) => {
    setCatalogOpen(false);
    dialog.current?.close();
    callback?.(...values);
  };

  return <>
    <section className="home-dashboard" aria-label="Trang chủ">
      <header className="home-greeting">
        <button className="home-avatar" type="button" title="Hồ sơ cá nhân" onClick={() => onNavigateTab('profile')}>
          {userAvatar && !avatarFailed ? <img src={userAvatar} alt="" onError={() => setAvatarFailed(true)} /> : <NavProfileIcon size={23} />}
        </button>
        <div className="home-greeting-copy">
          <h1>{userName?.trim() ? `Xin chào, ${userName.trim()}!` : 'Xin chào!'}</h1>
          <p>Hôm nay bạn muốn chăm sóc bản thân như thế nào?</p>
        </div>
        <button className="home-icon-button home-bell" type="button" title={unreadNotifications ? `Thông báo: ${unreadNotifications} chưa đọc` : 'Thông báo'} onClick={onOpenNotifications}>
          <BellIcon size={22} />{unreadNotifications > 0 && <span className="home-unread" />}
        </button>
      </header>

      <div className="home-branch">
        <label htmlFor="home-branch-select">Chi nhánh đang chọn</label>
        <div className="home-branch-control">
          <select id="home-branch-select" value={branches.some(branch => branch.id === selectedBranchId) ? selectedBranchId : branches[0]?.id || ''}
            onChange={event => onChangeBranch(event.target.value)} disabled={loading || !branches.length}>
            {!branches.length && <option value="">{loading ? 'Đang tải chi nhánh...' : ''}</option>}
            {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <ChevronDownIcon size={18} />
        </div>
      </div>

      <div className="home-search">
        <button type="button" className="home-icon-button" title="Tìm kiếm" onClick={onOpenSearch}><SearchIcon size={21} /></button>
        <button type="button" className="home-search-field" onClick={onOpenSearch}>Tìm dịch vụ, khóa học, chuyên viên...</button>
      </div>

      {(loading || error) && <div className="home-data-status" role={error ? 'alert' : 'status'}>
        <span>{error || 'Đang cập nhật dữ liệu...'}</span>
        {error && <button type="button" title="Thử tải lại" disabled={loading} onClick={onRefresh}><RefreshIcon size={18} /></button>}
      </div>}

      <section className="home-feature" aria-label="Chăm sóc và dịch vụ"
        onTouchStart={event => { touchStart.current = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }; }}
        onTouchEnd={event => {
          if (!touchStart.current) return;
          const dx = event.changedTouches[0].clientX - touchStart.current.x;
          const dy = event.changedTouches[0].clientY - touchStart.current.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) changeSlide(dx < 0 ? 1 : -1);
          touchStart.current = null;
        }} onTouchCancel={() => { touchStart.current = null; }}>
        <button type="button" className="home-feature-photo" disabled={!service} title={service ? `Xem ${service.title}` : undefined}
          onClick={() => service ? props.onViewServiceDetail(service) : onNavigateTab('services')}>
          <EntityImage src={service?.image} alt={service?.title || ''} className="home-service-image" />
        </button>
        <div className="home-feature-copy" aria-live="polite">
          <span className="home-feature-divider" />
          <h2>{service?.title}</h2>
          <p>{service?.description}</p>
          <button type="button" className="home-book-button" disabled={loading || !services.length || !branches.length}
            onClick={() => service ? props.onSelectService(service) : onNavigateTab('services')}>Đặt lịch ngay</button>
        </div>
        <div className="home-feature-footer">
          <div className="home-pagination" aria-label="Chọn nội dung nổi bật">
            {slideIds.map((id, i) => <button key={id} type="button" aria-label={`Dịch vụ: ${heroServices[i].title}`}
              aria-pressed={index === i} title={heroServices[i].title} onClick={() => setSlideId(id)}><span /></button>)}
          </div>
          <div className="home-feature-tools">
            <button className="home-icon-button home-refresh" type="button" title="Khám phá dịch vụ và tiện ích" onClick={() => setCatalogOpen(true)}><DashboardIcon size={16} /></button>
            <button className="home-icon-button home-refresh" type="button" title="Cập nhật dữ liệu" disabled={loading} onClick={onRefresh}><RefreshIcon size={16} /></button>
          </div>
        </div>
      </section>
    </section>
    <dialog ref={dialog} className="home-catalog-dialog" onClose={() => setCatalogOpen(false)} aria-label="Khám phá dịch vụ và tiện ích">
      {catalogOpen && <>
        <header className="home-catalog-header"><h2>Khám phá</h2><button type="button" className="home-icon-button" title="Đóng" onClick={() => setCatalogOpen(false)}><CloseIcon size={22} /></button></header>
        <HomeCatalog {...props} onSelectService={closeThen(props.onSelectService)} onViewServiceDetail={closeThen(props.onViewServiceDetail)}
          onSelectDoctor={closeThen(props.onSelectDoctor)} onSelectBranch={closeThen(props.onSelectBranch)} onOpenDirections={closeThen(props.onOpenDirections)}
          onSelectCourse={closeThen(props.onSelectCourse)} onNavigateTab={closeThen(props.onNavigateTab)}
          onOpenSearch={closeThen(props.onOpenSearch)} onOpenNotifications={closeThen(props.onOpenNotifications)}
          onOpenBranches={closeThen(props.onOpenBranches)} onOpenSpecialists={closeThen(props.onOpenSpecialists)} />
      </>}
    </dialog>
  </>;
}
