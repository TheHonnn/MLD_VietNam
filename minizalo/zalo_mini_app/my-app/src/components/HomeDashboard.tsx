import React, { useEffect, useRef, useState } from 'react';
import { HomeCatalog, GroupBHomeProps } from './GroupBHome';
import { BellIcon, ChevronDownIcon, CloseIcon, DashboardIcon, NavProfileIcon, RefreshIcon, SearchIcon } from './Icons';
import { EntityImage } from './GroupBExtensions';
import '@/css/home-dashboard.scss';
import { useCarousel } from '@/hooks/useCarousel';
import { useBackAction } from '@/hooks/useNavigationHistory';
import { BranchHours } from './GroupBExtensions';
import { CalendarIcon, NavAcademyIcon, MapIcon, UserCheckIcon, ArrowRightIcon } from './Icons';
import {PortalBanners} from './PortalBanners';
import type {PortalBanner} from './PortalBanners';

interface HomeDashboardProps extends GroupBHomeProps {
  banners?:PortalBanner[];
  onBannerNavigate?:(screen:string)=>void;
  carouselPaused?: boolean;
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
  const [catalogOpen, setCatalogOpen] = useState(false);
  useBackAction(catalogOpen,()=>setCatalogOpen(false));
  const [interacting, setInteracting] = useState(false);
  const [touching,setTouching]=useState(false);
  const suppressSwipeClick=useRef(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const featured = services.filter(service => service.isFeatured);
  const heroServices = (featured.length ? featured : services).slice(0, 3);
  const slideIds = heroServices.map(service => service.id);
  const { index, select: setSlideId, move: changeSlide } = useCarousel(slideIds, Boolean(props.carouselPaused) || catalogOpen || interacting || touching || loading);
  const service = heroServices[index];
  const selectedBranch=branches.find(branch=>branch.id===selectedBranchId)||branches[0];
  const faqs=props.metadata?.faqs?.filter(item=>item.isActive!==false)||[];
  const guidelines = props.guidelines?.filter(item => item.isPublished !== false) || [];

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
    <section className={`home-dashboard${!service && !loading ? ' home-dashboard--without-feature' : ''}`} aria-label="Trang chủ">
      <header className="home-greeting">
        <button className="home-avatar" type="button" title="Hồ sơ cá nhân" onClick={() => onNavigateTab('profile')}>
          {userAvatar && !avatarFailed ? <img src={userAvatar} alt="" onError={() => setAvatarFailed(true)} /> : <NavProfileIcon size={23} />}
        </button>
        <div className="home-greeting-copy">
          <h1>{userName?.trim() ? `Xin chào, ${userName.trim()}!` : 'Xin chào!'}</h1>
          <p>{props.staffMode?'Hôm nay bạn hỗ trợ khách hàng nào?':'Chăm sóc sức khỏe và phát triển chuyên môn'}</p>
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
        <button type="button" className="home-icon-button" title="Tìm kiếm" disabled={loading} onClick={onOpenSearch}><SearchIcon size={21} /></button>
        <button type="button" className="home-search-field" disabled={loading} onClick={onOpenSearch}>Tìm dịch vụ, khóa học, chuyên viên...</button>
      </div>

      {(loading || error) && <div className="home-data-status" role={error ? 'alert' : 'status'}>
        <span>{error || 'Đang cập nhật dữ liệu...'}</span>
        {error && <button type="button" title="Thử tải lại" disabled={loading} onClick={onRefresh}><RefreshIcon size={18} /></button>}
      </div>}

      {Boolean(props.banners?.length)&&<PortalBanners items={props.banners!} paused={Boolean(props.carouselPaused)||loading} onNavigate={props.onBannerNavigate||(()=>{})}/>}
      {service && !props.banners?.length && <section className="home-feature" aria-label="Chăm sóc và dịch vụ"
        onFocusCapture={event => setInteracting(event.target.matches(':focus-visible'))} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
        onClickCapture={event=>{if(suppressSwipeClick.current){suppressSwipeClick.current=false;event.preventDefault();event.stopPropagation();}}}
        onTouchStart={event => {
          setTouching(true);suppressSwipeClick.current=false;
          touchStart.current=event.touches.length===1?{x:event.changedTouches[0].clientX,y:event.changedTouches[0].clientY}:null;
        }}
        onTouchEnd={event => {
          if(event.touches.length){touchStart.current=null;return;}
          setTouching(false);
          if (!touchStart.current) return;
          const dx = event.changedTouches[0].clientX - touchStart.current.x;
          const dy = event.changedTouches[0].clientY - touchStart.current.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {suppressSwipeClick.current=true;changeSlide(dx < 0 ? 1 : -1);}
          touchStart.current = null;
        }} onTouchCancel={() => { touchStart.current = null;setTouching(false);suppressSwipeClick.current=false; }}>
        <button type="button" className="home-feature-photo" disabled={!service} title={service ? `Xem ${service.title}` : undefined}
          onClick={() => service ? props.onViewServiceDetail(service) : onNavigateTab('services')}>
          <EntityImage key={service?.id} src={service?.image} alt={service?.title || ''} className="home-service-image carousel-enter" />
        </button>
        <div className="home-feature-copy" aria-live="polite">
          <span className="home-feature-divider" />
          <h2 key={`${service?.id}:title`} className="carousel-enter">{service?.title}</h2>
          <p key={`${service?.id}:description`} className="carousel-enter">{service?.description}</p>
          <button type="button" className="home-book-button" disabled={loading || !services.length || !branches.length}
            onClick={() => service ? props.onSelectService(service) : onNavigateTab('services')}>Đặt lịch ngay</button>
        </div>
        <div className="home-feature-footer">
          <div className="home-pagination" aria-label="Chọn nội dung nổi bật">
            {slideIds.map((id, i) => <button key={id} type="button" aria-label={`Dịch vụ: ${heroServices[i].title}`}
              aria-pressed={index === i} title={heroServices[i].title} onClick={() => setSlideId(id)}><span /></button>)}
          </div>
          <div className="home-feature-tools">
            <button className="home-icon-button home-refresh" type="button" title="Khám phá dịch vụ và tiện ích" disabled={loading} onClick={() => setCatalogOpen(true)}><DashboardIcon size={16} /></button>
            <button className="home-icon-button home-refresh" type="button" title="Cập nhật dữ liệu" disabled={loading} onClick={onRefresh}><RefreshIcon size={16} /></button>
          </div>
        </div>
      </section>}
    </section>
    <div className="home-more">
      <nav className="home-shortcuts" aria-label="Tiện ích nhanh">
        <button type="button" onClick={()=>onNavigateTab('booking')}><CalendarIcon size={22}/><span>Lịch hẹn</span></button>
        <button type="button" onClick={()=>onNavigateTab('academy')}><NavAcademyIcon size={22}/><span>Đào tạo</span></button>
        <button type="button" disabled={loading} onClick={props.onOpenBranches}><MapIcon size={22}/><span>Chi nhánh</span></button>
        <button type="button" disabled={loading} onClick={props.onOpenSpecialists}><UserCheckIcon size={22}/><span>Chuyên viên</span></button>
      </nav>
      <nav className="home-shortcuts" aria-label="Quản lý khách và tài liệu">
        {props.staffMode&&<button type="button" onClick={()=>onNavigateTab('customers')}><UserCheckIcon size={22}/><span>Hồ sơ khách</span></button>}
        <button type="button" onClick={()=>onNavigateTab('documents')}><NavAcademyIcon size={22}/><span>Tài liệu</span></button>
        <button type="button" onClick={()=>onNavigateTab('community')}><UserCheckIcon size={22}/><span>Cộng đồng</span></button>
      </nav>
      {props.upcomingBooking&&<section className="home-information"><h2>Lịch hẹn sắp tới</h2><button className="home-upcoming" type="button" onClick={()=>props.onOpenBooking?props.onOpenBooking(props.upcomingBooking!):onNavigateTab('booking')}><span><strong>{props.upcomingBooking.serviceTitle}</strong><small>{props.upcomingBooking.date.slice(0,10).split('-').reverse().join('/')} · {props.upcomingBooking.timeSlot.split(' - ').map(time=>time.slice(0,5)).join(' - ')}</small><small>{props.upcomingBooking.branchName}</small></span><ArrowRightIcon size={20}/></button></section>}
      {!loading&&!error&&<section className="home-information home-about"><h2>Tổng quan dữ liệu</h2><div><span>{services.length} dịch vụ</span><span>{branches.length} chi nhánh</span>{Boolean(props.courses?.length)&&<span>{props.courses?.length} khóa học</span>}</div></section>}
      {services.length>0&&<section className="home-information"><header><h2>Dịch vụ chăm sóc</h2><button type="button" onClick={()=>onNavigateTab('services')}>Xem tất cả</button></header><div className="home-preview-list">{services.slice(0,3).map(item=><button key={item.id} type="button" onClick={()=>props.onViewServiceDetail(item)}><EntityImage src={item.image} alt={item.title}/><span><strong>{item.title}</strong><small>{item.durationMinutes} phút · {item.price.toLocaleString('vi-VN')}đ</small></span><ArrowRightIcon size={18}/></button>)}</div></section>}
      {Boolean(props.courses?.length)&&<section className="home-information"><header><h2>Đào tạo và phát triển nghề</h2><button type="button" onClick={()=>onNavigateTab('academy')}>Xem tất cả</button></header><div className="home-preview-list">{props.courses?.slice(0,3).map(item=><button key={item.id} type="button" onClick={()=>props.onSelectCourse?.(item)}><EntityImage src={item.image} alt={item.title}/><span><strong>{item.title}</strong><small>{item.duration} · {item.price.toLocaleString('vi-VN')}đ</small></span><ArrowRightIcon size={18}/></button>)}</div></section>}
      {selectedBranch&&<section className="home-information"><header><h2>Chi nhánh của bạn</h2><button type="button" onClick={()=>props.onSelectBranch(selectedBranch)}>Chi tiết</button></header><h3>{selectedBranch.name}</h3><p>{selectedBranch.address}</p><BranchHours branch={selectedBranch}/>{selectedBranch.phone&&<a href={`tel:${selectedBranch.phone}`}>{selectedBranch.phone}</a>}<button className="home-direction-link" type="button" onClick={()=>props.onOpenDirections(selectedBranch)}><MapIcon size={18}/>Chỉ đường</button></section>}
      {guidelines.length>0&&<section className="home-information"><h2>Cẩm nang chăm sóc</h2>{guidelines.map(item=><details key={item.id}><summary>{item.title}</summary>{item.imageUrl&&<EntityImage src={item.imageUrl} alt={item.title}/>}<p>{item.summary}</p>{item.content&&<p>{item.content}</p>}</details>)}</section>}
      {faqs.length>0&&<section className="home-information"><h2>Câu hỏi thường gặp</h2>{faqs.map(item=><details key={item.id}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>}
    </div>
    <dialog ref={dialog} className="home-catalog-dialog" onClose={() => setCatalogOpen(false)} aria-label="Khám phá dịch vụ và tiện ích">
      {catalogOpen && <>
        <header className="home-catalog-header"><h2>Khám phá</h2><button type="button" className="home-icon-button" title="Đóng" onClick={() => setCatalogOpen(false)}><CloseIcon size={22} /></button></header>
        <HomeCatalog {...props} onSelectService={closeThen(props.onSelectService)} onViewServiceDetail={closeThen(props.onViewServiceDetail)}
          onSelectDoctor={closeThen(props.onSelectDoctor)} onSelectBranch={closeThen(props.onSelectBranch)} onOpenDirections={closeThen(props.onOpenDirections)}
          onSelectCourse={closeThen(props.onSelectCourse)} onNavigateTab={closeThen(props.onNavigateTab)}
          onOpenBooking={closeThen(props.onOpenBooking)}
          onOpenSearch={closeThen(props.onOpenSearch)} onOpenNotifications={closeThen(props.onOpenNotifications)}
          onOpenBranches={closeThen(props.onOpenBranches)} onOpenSpecialists={closeThen(props.onOpenSpecialists)} />
      </>}
    </dialog>
  </>;
}
