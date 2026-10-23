import React from 'react';
import {shareService} from '@/utils/service-links';
import type { MedicalService, Doctor, Branch } from '../../../../backend/src/data/database';
import type { Branch as CanonicalBranch } from '../../../../../database/shared_types';
import { ArrowLeftIcon, MapIcon, SearchIcon, LocationIcon, HeartIcon, ShareIcon } from '@/components/Icons';
import '@/css/specialists.scss';
import '@/css/branches.scss';
import '@/css/service-detail.scss';
import {apiClient} from '@/api/client';
import { searchText, vietnamToday } from '@/utils/catalog';
import { useDirectorySlots } from '@/hooks/useDirectorySlots';

export interface PublicReview {
  id: string;
  rating: number;
  comment?: string | null;
  branchReply?: string | null;
  photos?: string[];
}
type ContentItem = string | Record<string, unknown>;
export type ServiceDetails = Omit<MedicalService, 'steps' | 'benefits' | 'reviews'> & {
  categoryId?: string;
  steps?: ContentItem[];
  benefits?: ContentItem[];
  galleryUrls?: string[];
  reviews?: (PublicReview | Record<string, unknown>)[];
};
export type DoctorDetails = Omit<Doctor, 'reviews'> & { specialties?: string[]; reviews?: (PublicReview | Record<string, unknown>)[] };
export type BranchDetails = Omit<Branch, 'amenities'> & Partial<Pick<CanonicalBranch, 'openingTime' | 'closingTime' | 'latitude' | 'longitude' | 'galleryUrls'>> & { amenities?: ContentItem[] };

const contentText = (item: ContentItem, field: string) => typeof item === 'string' ? item : typeof item[field] === 'string' ? item[field] as string : '';

const buttonClass = 'rounded-[8px] border border-[#DED2C5] bg-white px-3 py-2 text-xs font-semibold text-[#98501B] disabled:opacity-50';
const inputClass = 'mt-1 h-10 w-full min-w-0 rounded-[8px] border border-[#DED2C5] bg-white px-3 text-xs text-[#40352F]';

export const EntityImage: React.FC<{ src?: string | null; alt: string; className?: string }> = ({ src, alt, className = 'h-44 w-full' }) => {
  const [failedSource, setFailedSource] = React.useState<string | null>(null);
  React.useEffect(()=>{setFailedSource(null);},[src]);
  React.useEffect(()=>{
    if(!failedSource)return;
    const retry=()=>setFailedSource(null);
    window.addEventListener('online',retry);
    return()=>window.removeEventListener('online',retry);
  },[failedSource]);
  return src && failedSource !== src
    ? <img key={src} src={src} alt={alt} onError={() => setFailedSource(src)} className={className + ' rounded-[8px] object-cover'} />
    : <div className={className + ' flex items-center justify-center rounded-[8px] bg-stone-100 p-3 text-center text-xs text-stone-500'}></div>;
};

export const BranchHours: React.FC<{ branch: BranchDetails }> = ({ branch }) => (
  <p className="text-xs text-stone-600">Giờ hoạt động: {branch.openingTime && branch.closingTime
    ? branch.openingTime + ' - ' + branch.closingTime : ''}</p>
);

const branchCoordinates = (branch: BranchDetails) => {
  if (branch.latitude == null || branch.longitude == null || String(branch.latitude).trim() === '' || String(branch.longitude).trim() === '') return null;
  const latitude = Number(branch.latitude), longitude = Number(branch.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
};

const distanceKm = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(radians(to.latitude - from.latitude) / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(radians(to.longitude - from.longitude) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
};

export const BranchMap: React.FC<{ branch: BranchDetails }> = ({ branch }) => {
  const coordinates = branchCoordinates(branch);
  if (!coordinates) return null;
  const { latitude, longitude } = coordinates;
  const params = new URLSearchParams({
    bbox: [Math.max(-180, longitude - .015), Math.max(-90, latitude - .01), Math.min(180, longitude + .015), Math.min(90, latitude + .01)].join(','),
    layer: 'mapnik', marker: `${latitude},${longitude}`,
  });
  return <div className="branch-map"><iframe key={branch.id} title={`Bản đồ ${branch.name}`} loading="lazy" referrerPolicy="no-referrer" src={`https://www.openstreetmap.org/export/embed.html?${params}`} /><MapLink branch={branch} /></div>;
};

const MapLink: React.FC<{ branch: BranchDetails }> = ({ branch }) => {
  const coordinates=branchCoordinates(branch);
  const destination = coordinates ? coordinates.latitude + ',' + coordinates.longitude : branch.address?.trim();
  return destination
    ? <a href={'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destination)} target="_blank" rel="noopener noreferrer" className={buttonClass + ' inline-flex items-center gap-2'}><MapIcon size={14} />Mở bản đồ</a>
    : <p className="text-stone-500"></p>;
};

const DetailScreen: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; className?: string }> = ({ title, onClose, children, footer, className = '' }) => (
  <div className={`absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#FAF6F0] text-[#40352F] ${className}`}>
    <header className="flex shrink-0 items-center gap-3 border-b border-[#EADECF] bg-white p-4">
      <button onClick={onClose} aria-label="Quay lại" title="Quay lại" className={buttonClass}><ArrowLeftIcon size={18} /></button>
      <h1 className="min-w-0 break-words text-base font-bold">{title}</h1>
    </header>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-xs [overflow-wrap:anywhere]">{children}</div>
    {footer && <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[#EADECF] bg-white p-4">{footer}</footer>}
  </div>
);

const Gallery: React.FC<{ urls?: string[]; name: string }> = ({ urls = [], name }) => urls.length ? (
  <section className="space-y-2"><h2 className="font-bold">Thư viện ảnh</h2><div className="grid grid-cols-2 gap-2">{urls.filter(Boolean).map((url, index) => <EntityImage key={url + index} src={url} alt={name} className="h-28 w-full" />)}</div></section>
) : null;

const Reviews: React.FC<{ reviews?: (PublicReview | Record<string, unknown>)[] }> = ({ reviews }) => (
  <section className="space-y-2"><h2 className="font-bold">Đánh giá</h2>
    {!reviews?.length ? <p className="text-stone-500"></p> : reviews.map((review, index) => (
      <article key={typeof review.id === 'string' ? review.id : index} className="space-y-2 border-b border-[#EADECF] py-3">
        {review.rating != null && Number.isFinite(Number(review.rating)) && <p className="font-semibold">{Number(review.rating)}/5</p>}
        {typeof review.comment === 'string' && <p className="whitespace-pre-line">{review.comment}</p>}
        {typeof review.branchReply === 'string' && <p className="text-stone-600">Phản hồi chi nhánh: {review.branchReply}</p>}
        <Gallery urls={Array.isArray(review.photos) ? review.photos.filter((photo): photo is string => typeof photo === 'string') : []} name="Ảnh đánh giá" />
      </article>
    ))}
  </section>
);

export const BranchDirectoryModal: React.FC<{
  branches: BranchDetails[];
  services?: MedicalService[];
  initialQuery?: string;
  onClose: () => void;
  onSelectBranch: (branch: Branch) => void;
}> = ({ branches, services = [], initialQuery = '', onClose, onSelectBranch }) => {
  const [query, setQuery] = React.useState(initialQuery);
  const [city, setCity] = React.useState('');
  const [serviceId, setServiceId] = React.useState('');
  const [date, setDate] = React.useState(vietnamToday);
  const availability = useDirectorySlots(branches.map(branch => branch.id), serviceId, date);
  const [mode, setMode] = React.useState<'list' | 'map'>('list');
  const [mapBranchId, setMapBranchId] = React.useState('');
  const [position, setPosition] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [locationError, setLocationError] = React.useState('');
  const locationRequest = React.useRef(0);
  React.useEffect(() => () => { locationRequest.current++; }, []);
  const cities = Array.from(new Set(branches.map(branch => branch.city).filter(Boolean)));
  const results = branches.filter(branch => (!city || branch.city === city)
    && searchText(`${branch.name} ${branch.address} ${branch.city}`).includes(searchText(query))
    && (!serviceId || (!!date && !availability.loading && !availability.error && availability.slots.some(slot => slot.branchId === branch.id))))
    .sort((a, b) => {
      if (!position) return a.name.localeCompare(b.name, 'vi');
      const ca = branchCoordinates(a), cb = branchCoordinates(b);
      if (!ca || !cb) return ca ? -1 : cb ? 1 : a.name.localeCompare(b.name, 'vi');
      return distanceKm(position, ca) - distanceKm(position, cb);
    });
  const mappedBranches = results.filter(branch => branchCoordinates(branch));
  const mappedBranch = mappedBranches.find(branch => branch.id === mapBranchId) || mappedBranches[0];
  const locate = () => {
    setLocationError('');
    if (!navigator.geolocation) { setLocationError('Thiết bị chưa hỗ trợ lấy vị trí.'); return; }
    if (!branches.some(branch => branchCoordinates(branch))) { setLocationError('Các chi nhánh chưa cập nhật tọa độ.'); return; }
    setLocating(true);
    const request = ++locationRequest.current;
    navigator.geolocation.getCurrentPosition(value => {
      if (request !== locationRequest.current) return;
      setLocating(false);
      setPosition({ latitude: value.coords.latitude, longitude: value.coords.longitude });
    }, error => {
      if (request !== locationRequest.current) return;
      setLocating(false);
      setLocationError(error.code === 1 ? 'Bạn chưa cho phép truy cập vị trí.' : 'Không lấy được vị trí. Vui lòng thử lại.');
    }, { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false });
  };
  return <section className="branch-directory" aria-labelledby="branch-directory-heading">
    <header className="branch-filters">
      <div className="branch-heading-row"><h1 id="branch-directory-heading">Hệ thống chi nhánh</h1><button type="button" className="branch-back" title="Quay lại" onClick={onClose}><ArrowLeftIcon size={18} /></button></div>
      <p className="branch-subtitle">Tìm cơ sở phù hợp với bạn.</p>
      <label className="branch-search"><span><SearchIcon size={19} /></span><input aria-label="Tìm chi nhánh" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm chi nhánh, địa chỉ..." /></label>
      <label className="branch-filter-label">Tỉnh / thành phố<select aria-label="Tỉnh / thành phố" value={city} onChange={event => setCity(event.target.value)}><option value="">Tất cả tỉnh / thành phố</option>{cities.map(item => <option key={item}>{item}</option>)}</select></label>
      <div className="branch-view-controls">
        <button type="button" className="branch-nearby" disabled={locating} aria-pressed={Boolean(position)} onClick={locate}><LocationIcon size={17} />{locating ? 'Đang tìm...' : 'Gần tôi'}</button>
        <div className="branch-view-modes" role="group" aria-label="Kiểu hiển thị chi nhánh"><button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>Danh sách</button><button type="button" aria-pressed={mode === 'map'} onClick={() => setMode('map')}>Bản đồ</button></div>
      </div>
      <label className="branch-filter-label">Dịch vụ có lịch trống<select aria-label="Dịch vụ có lịch trống" value={serviceId} onChange={event => setServiceId(event.target.value)}><option value="">Tất cả</option>{services.map(service => <option key={service.id} value={service.id}>{service.title}</option>)}</select></label>
      {serviceId && <label className="branch-filter-label">Ngày có lịch<input aria-label="Ngày có lịch tại chi nhánh" type="date" min={vietnamToday()} value={date} onChange={event => setDate(event.target.value)} className={inputClass} /></label>}
      {availability.error && <p role="alert" className="text-xs text-red-700">{availability.error} <button type="button" className={buttonClass} onClick={availability.retry}>Thử lại</button></p>}
      <p className="branch-result-count" role={locationError ? 'alert' : 'status'}>{locationError || (availability.error ? '' : availability.loading ? 'Đang tải lịch trống...' : `${results.length} chi nhánh phù hợp${position ? ' · Khoảng cách gần đúng' : ''}`)}</p>
    </header>
    <div className="branch-results" tabIndex={0} aria-label="Kết quả chi nhánh">
      {!results.length && <p className="branch-empty"></p>}
      {mode === 'map' && results.length > 0 && <div className="branch-map-results">
        {mappedBranch && <><label className="branch-filter-label">Chi nhánh trên bản đồ<select aria-label="Chi nhánh trên bản đồ" value={mappedBranch.id} onChange={event => setMapBranchId(event.target.value)}>{mappedBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><BranchMap branch={mappedBranch} /><button type="button" className="branch-map-detail" onClick={() => onSelectBranch(mappedBranch)}>Xem chi nhánh</button></>}
      </div>}
      {mode === 'list' && results.map(branch => {
        const coordinates = branchCoordinates(branch);
        return <button key={branch.id} type="button" onClick={() => onSelectBranch(branch)} className="branch-card">
          <EntityImage src={branch.imageUrl} alt={branch.name} className="branch-card-photo" />
          <div className="branch-card-copy"><h2>{branch.name}</h2><p>{branch.address || ''}</p><BranchHours branch={branch} />{position && coordinates && <span className="branch-distance">Cách khoảng {distanceKm(position, coordinates).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km</span>}</div>
        </button>;
      })}
    </div>
  </section>;
};

export const SpecialistDirectoryModal: React.FC<{
  doctors: DoctorDetails[];
  services?: MedicalService[];
  initialQuery?: string;
  onClose: () => void;
  onSelectDoctor: (doctor: Doctor) => void;
}> = ({ doctors, services = [], initialQuery = '', onClose, onSelectDoctor }) => {
  const [query, setQuery] = React.useState(initialQuery);
  const [branch, setBranch] = React.useState('');
  const [specialty, setSpecialty] = React.useState('');
  const [serviceId, setServiceId] = React.useState('');
  const [date, setDate] = React.useState(vietnamToday);
  const [time, setTime] = React.useState('');
  const availability = useDirectorySlots(doctors.map(doctor => doctor.branchId || '').filter(Boolean), serviceId, date);
  const times = Array.from(new Set(availability.slots.filter(slot => !branch || slot.branchId === branch).map(slot => slot.startTime.slice(0, 5)))).sort();
  const [sort, setSort] = React.useState('name');
  const branches = Array.from(new Map(doctors.filter(doctor => doctor.hospital).map(doctor => [doctor.branchId || doctor.hospital, doctor.hospital])).entries());
  const doctorSpecialties = (doctor: DoctorDetails) => doctor.specialties || doctor.specialty.split(',').map(value => value.trim()).filter(Boolean);
  const specialties = Array.from(new Set(doctors.flatMap(doctorSpecialties)));
  const results = doctors.filter(doctor => searchText(`${doctor.name} ${doctor.title} ${doctor.specialty} ${doctor.hospital}`).includes(searchText(query))
    && (!branch || (doctor.branchId || doctor.hospital) === branch) && (!specialty || doctorSpecialties(doctor).includes(specialty))
    && (!serviceId || (!!date && !availability.loading && !availability.error && availability.slots.some(slot => slot.technicianId === doctor.id && (!time || slot.startTime.slice(0,5) === time)))))
    .sort((a, b) => (sort === 'rating' ? (b.rating ?? -1) - (a.rating ?? -1) : 0) || a.name.localeCompare(b.name, 'vi'));
  return <section className="specialist-directory" aria-labelledby="specialist-directory-heading">
    <header className="specialist-filters">
      <div className="specialist-heading-row"><h1 id="specialist-directory-heading">Đội ngũ chuyên viên</h1><button type="button" className="specialist-back" title="Quay lại" onClick={onClose}><ArrowLeftIcon size={18} /></button></div>
      <p className="specialist-subtitle">Đồng hành cùng bạn trên hành trình chăm sóc sức khỏe.</p>
      <label className="specialist-search"><span><SearchIcon size={19} /></span><input aria-label="Tìm chuyên viên" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tên hoặc chuyên môn..." /></label>
      <div className="specialist-filter-grid">
        <label>Chi nhánh<select aria-label="Chi nhánh" value={branch} onChange={event => { setBranch(event.target.value); setTime(''); }}><option value="">Tất cả</option>{branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Chuyên môn<select aria-label="Chuyên môn" value={specialty} onChange={event => setSpecialty(event.target.value)}><option value="">Tất cả</option>{specialties.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Dịch vụ có lịch trống<select aria-label="Dịch vụ có lịch trống" value={serviceId} onChange={event => { setServiceId(event.target.value); setTime(''); }}><option value="">Tất cả</option>{services.map(service => <option key={service.id} value={service.id}>{service.title}</option>)}</select></label>
        <label>Giờ trống<select aria-label="Giờ trống" disabled={!serviceId || availability.loading} value={time} onChange={event => setTime(event.target.value)}><option value="">Tất cả</option>{times.map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      {serviceId && <label className="specialist-sort">Ngày có lịch<input aria-label="Ngày có lịch chuyên viên" type="date" min={vietnamToday()} value={date} onChange={event => { setDate(event.target.value); setTime(''); }} className={inputClass} /></label>}
      <label className="specialist-sort">Sắp xếp<select aria-label="Sắp xếp" value={sort} onChange={event => setSort(event.target.value)}><option value="name">Theo tên chuyên viên</option><option value="rating">Đánh giá cao nhất</option></select></label>
      {availability.error && <p role="alert" className="text-xs text-red-700">{availability.error} <button type="button" className={buttonClass} onClick={availability.retry}>Thử lại</button></p>}
      <p className="specialist-result-count" role="status">{availability.error ? '' : availability.loading ? 'Đang tải lịch trống...' : `${results.length} chuyên viên phù hợp`}</p>
    </header>
    <div className="specialist-results" tabIndex={0} aria-label="Kết quả chuyên viên">
      {results.map(doctor => <button key={doctor.id} type="button" onClick={() => onSelectDoctor(doctor)} className="specialist-card">
        <EntityImage src={doctor.avatar} alt={doctor.name} className="specialist-card-photo" />
        <div className="specialist-card-copy"><h2>{doctor.name}</h2><p>{doctor.title || doctor.specialty || 'Chuyên viên'}</p><span>{doctor.hospital || ''}</span>
          {doctor.reviewsCount > 0 && Number.isFinite(doctor.rating) && <small>{doctor.rating}/5 · {doctor.reviewsCount} đánh giá</small>}
        </div>
      </button>)}
    </div>
  </section>;
};

export const ServiceDetailModal: React.FC<{
  userId?:string;
  bookingError?:string;
  onRequireLogin?:()=>void;
  service: ServiceDetails | null;
  onClose: () => void;
  onBookNow: (service: MedicalService) => void;
}> = ({ service, onClose, onBookNow,userId,onRequireLogin,bookingError }) => {
  const [shareStatus, setShareStatus] = React.useState('');
  const [sharing, setSharing] = React.useState(false);
  const [favorite,setFavorite]=React.useState(false);
  const [favoriteBusy,setFavoriteBusy]=React.useState(false);
  const favoriteLock=React.useRef(false);
  const favoriteScope=React.useRef('');favoriteScope.current=`${userId||''}/${service?.id||''}`;
  React.useEffect(()=>{
    let cancelled=false;setFavorite(false);setFavoriteBusy(false);
    if(!service?.id||!userId)return;
    setFavoriteBusy(true);
    void apiClient.getServiceFavorite(service.id).then(result=>{if(!cancelled){if(result?.error)setShareStatus(result.error);else setFavorite(result.isFavorite===true);}}).finally(()=>{if(!cancelled)setFavoriteBusy(false);});
    return()=>{cancelled=true;};
  },[service?.id,userId]);
  const screen = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    setShareStatus('');
    const previous = document.activeElement as HTMLElement | null;
    screen.current?.querySelector<HTMLButtonElement>('.service-detail-back')?.focus({preventScroll:true});
    return () => { if (previous?.isConnected) previous.focus({preventScroll:true}); };
  }, [service?.id]);
  if (!service) return null;
  const price = Number.isFinite(service.price) ? `${service.price.toLocaleString('vi-VN')}đ` : '';
  const duration = Number.isFinite(service.durationMinutes) ? `${service.durationMinutes} phút` : '';
  const share = async () => {
    if (sharing) return;
    setSharing(true); setShareStatus('');
    try {
      setShareStatus(await shareService(service));
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setShareStatus('Không thể chia sẻ thông tin dịch vụ.');
    } finally { setSharing(false); }
  };
  return <section ref={screen} className="service-detail" role="dialog" aria-modal="true" aria-labelledby="service-detail-heading" onKeyDown={event => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    if (event.key === 'Tab') {
      const items=screen.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],[tabindex="0"]');
      if (!items?.length) return;
      const first=items[0],last=items[items.length-1];
      if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first.focus(); }
    }
  }}>
    <main className="service-detail-body" tabIndex={0} aria-label="Thông tin dịch vụ">
      <div className="service-detail-media">
        <EntityImage src={service.image} alt={service.title} className="service-detail-photo" />
        <button type="button" className="service-detail-icon service-detail-back" title="Quay lại" onClick={onClose}><ArrowLeftIcon size={20}/></button>
        <div className="service-detail-tools">
          <button type="button" className="service-detail-icon" title={favorite?'Bỏ yêu thích':'Yêu thích'} aria-label="Yêu thích" aria-pressed={favorite} disabled={favoriteBusy} onClick={async()=>{
            if(!userId){onRequireLogin?.();return;}
            if(favoriteLock.current)return;const scope=favoriteScope.current;favoriteLock.current=true;setFavoriteBusy(true);setShareStatus('');
            try{const result=await apiClient.setServiceFavorite(service.id,!favorite);if(favoriteScope.current!==scope)return;if(result?.error)setShareStatus(result.error);else setFavorite(result.isFavorite===true);}finally{favoriteLock.current=false;if(favoriteScope.current===scope)setFavoriteBusy(false);}
          }}><HeartIcon size={21}/></button>
          <button type="button" className="service-detail-icon" title="Chia sẻ dịch vụ" disabled={sharing} onClick={share}><ShareIcon size={20}/></button>
        </div>
      </div>
      {shareStatus && <p className="service-detail-share-status" role="status">{shareStatus}</p>}
      {bookingError&&<p role="alert" className="service-detail-share-status">{bookingError}</p>}
      {service.category && <span className="service-detail-category">{service.category}</span>}
      <h1 id="service-detail-heading">{service.title}</h1>
      <div className="service-detail-price"><strong>{price}</strong><span>{duration}</span></div>
      {service.originalPrice != null && Number.isFinite(service.originalPrice) && service.originalPrice > service.price && <p className="service-detail-original"><s>{service.originalPrice.toLocaleString('vi-VN')}đ</s></p>}
      <section className="service-detail-section"><h2>Giới thiệu dịch vụ</h2><p>{service.description}</p></section>
      {!!service.benefits?.length && <section className="service-detail-section"><h2>Trải nghiệm nổi bật</h2><ul>{service.benefits.map((benefit,index)=><li key={index}>{contentText(benefit,'title')||contentText(benefit,'description')}</li>)}</ul></section>}
      {!!service.steps?.length && <section className="service-detail-section"><h2>Quy trình trải nghiệm</h2>{service.steps.map((step,index)=><div key={index} className="service-detail-step"><h3>{typeof step!=='string'&&typeof step.step==='number'?`${step.step}. `:''}{contentText(step,'title')}</h3>{typeof step!=='string'&&<p>{contentText(step,'desc')||contentText(step,'description')}</p>}</div>)}</section>}
      <Gallery urls={service.galleryUrls} name={service.title}/>
      {!!service.reviews?.length && <div className="service-detail-section">{service.reviewsCount>0&&Number.isFinite(service.rating)&&<p>{service.rating}/5 · {service.reviewsCount} đánh giá</p>}<Reviews reviews={service.reviews}/></div>}
    </main>
    <footer className="service-detail-footer"><div className="service-detail-footer-summary"><strong>{price}</strong><span>{duration}</span></div><button type="button" className="service-detail-book" onClick={()=>onBookNow(service)}>Đặt lịch ngay</button><span className="service-detail-indicator" aria-hidden="true"/></footer>
  </section>;
};

export const SpecialistDetailModal: React.FC<{
  doctor: DoctorDetails | null;
  branches?: BranchDetails[];
  bookingError?:string;
  onClose: () => void;
  onBookWithDoctor: (doctor: Doctor) => void;
}> = ({ doctor, branches = [], bookingError, onClose, onBookWithDoctor }) => {
  if (!doctor) return null;
  const branch = branches.find(item => item.id === doctor.branchId);
  return <section className="specialist-detail" aria-labelledby="specialist-detail-heading">
    <header className="specialist-detail-header"><button type="button" className="specialist-back" title="Quay lại danh sách chuyên viên" onClick={onClose}><ArrowLeftIcon size={20} /></button></header>
    <div className="specialist-detail-body" tabIndex={0} aria-label="Hồ sơ chuyên viên">
      <EntityImage src={doctor.avatar} alt={doctor.name} className="specialist-detail-photo" />
      <h1 id="specialist-detail-heading">{doctor.name}</h1>
      {doctor.title && <p className="specialist-role">{doctor.title}</p>}
      {doctor.experienceYears != null && <p className="specialist-experience">{doctor.experienceYears} năm kinh nghiệm</p>}
      <div className="specialist-location"><p>{branch?.name || doctor.hospital || ''}</p>{branch?.address && <p>{branch.address}</p>}</div>
      <section className="specialist-introduction"><h2>Giới thiệu</h2><p>{doctor.bio || ''}</p></section>
      <section className="specialist-introduction"><h2>Chuyên môn</h2><p>{doctor.specialty || ''}</p></section>
      {doctor.reviewsCount > 0 && Number.isFinite(doctor.rating) && <p className="specialist-rating">{doctor.rating}/5 · {doctor.reviewsCount} đánh giá</p>}
      <Reviews reviews={doctor.reviews} />
    </div>
    <footer className="specialist-booking-footer">{bookingError&&<p role="alert" className="mb-2 text-xs text-red-700">{bookingError}</p>}<button type="button" disabled={!branch} title={!branch ? '' : undefined} onClick={() => onBookWithDoctor(doctor)}>{branch ? 'Đặt lịch với chuyên viên' : 'Chưa thể đặt lịch'}</button></footer>
  </section>;
};

export const BranchDetailModal: React.FC<{
  branch: BranchDetails | null;
  bookingError?: string;
  onClose: () => void;
  onSelectBranch: (branch: Branch) => void;
  onOpenDirections?: (branch: Branch) => void;
}> = ({ branch, bookingError, onClose, onSelectBranch, onOpenDirections }) => {
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null);
  React.useEffect(() => { setSelectedPhoto(null); }, [branch?.id]);
  if (!branch) return null;
  const photos = Array.from(new Set([branch.imageUrl, ...(branch.galleryUrls || [])].filter((url): url is string => Boolean(url))));
  return <section className="branch-detail" aria-labelledby="branch-detail-heading">
    <header className="branch-detail-header"><button type="button" className="branch-back" title="Quay lại danh sách chi nhánh" onClick={onClose}><ArrowLeftIcon size={20} /></button></header>
    <div className="branch-detail-body" tabIndex={0} aria-label="Thông tin chi nhánh">
      <h1 id="branch-detail-heading">{branch.name}</h1>
      {branch.city && <p className="branch-city">{branch.city}</p>}
      <button type="button" className="branch-cover" title="Xem ảnh chính của chi nhánh" onClick={() => setSelectedPhoto(null)}><EntityImage src={selectedPhoto || photos[0]} alt={branch.name} className="branch-detail-photo" /></button>
      {photos.length > 1 && <div className="branch-photo-grid">{photos.slice(1).map((url, index) => <button type="button" key={url} aria-pressed={selectedPhoto === url} title={`Xem ảnh chi nhánh ${index + 1}`} onClick={() => setSelectedPhoto(url)}><EntityImage src={url} alt={`Ảnh ${index + 1} của ${branch.name}`} className="branch-gallery-photo" /><span>Ảnh chi nhánh {index + 1}</span></button>)}</div>}
      <div className="branch-contact"><p>{branch.address || ''}</p><BranchHours branch={branch} />{branch.phone && <a href={'tel:' + branch.phone}>Hotline: {branch.phone}</a>}</div>
      <div className="branch-directions">{onOpenDirections ? <button type="button" onClick={() => onOpenDirections(branch)}><MapIcon size={18} />Chỉ đường</button> : <MapLink branch={branch} />}</div>
      <section className="branch-amenities"><h2>Tiện nghi</h2>{branch.amenities?.length ? <ul>{branch.amenities.map((amenity, index) => <li key={index}>{contentText(amenity, 'name') || contentText(amenity, 'title')}</li>)}</ul> : <p></p>}</section>
    </div>
    <footer className="branch-booking-footer">{bookingError&&<p role="alert" className="mb-2 text-xs text-red-700">{bookingError}</p>}<button type="button" onClick={() => onSelectBranch(branch)}>Đặt lịch tại chi nhánh</button></footer>
  </section>;
};

export const LocationDirectionsModal: React.FC<{
  branch: BranchDetails | null;
  bookingError?: string;
  onClose: () => void;
  onBookAtBranch?: (branch: Branch) => void;
}> = ({ branch, bookingError, onClose, onBookAtBranch }) => {
  const [copyStatus, setCopyStatus] = React.useState('');
  React.useEffect(() => { setCopyStatus(''); }, [branch?.id]);
  if (!branch) return null;
  const handleCopy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(branch.address);
      setCopyStatus('Đã sao chép địa chỉ');
    } catch { setCopyStatus('Không thể sao chép địa chỉ.'); }
  };
  return <DetailScreen className="branch-location-screen" title="Chỉ đường đến cơ sở" onClose={onClose} footer={onBookAtBranch && <button onClick={() => onBookAtBranch(branch)} className={buttonClass}>Đặt lịch tại cơ sở này</button>}>
    <h2 className="text-sm font-bold">{branch.name}</h2><p>{branch.address || ''}</p>
    {bookingError&&<p role="alert" className="text-xs text-red-700">{bookingError}</p>}
    {branch.phone && <a className="block" href={'tel:' + branch.phone}>Hotline: {branch.phone}</a>}
    <BranchHours branch={branch} /><MapLink branch={branch} />
    {branch.address && <button onClick={handleCopy} className={buttonClass}>Sao chép địa chỉ</button>}
    {copyStatus && <p role="status">{copyStatus}</p>}
  </DetailScreen>;
};

