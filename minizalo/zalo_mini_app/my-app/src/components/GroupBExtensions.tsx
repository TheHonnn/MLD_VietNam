import React from 'react';
import type { MedicalService, Doctor, Branch } from '../../../../backend/src/data/database';
import type { Branch as CanonicalBranch } from '../../../../../database/shared_types';
import { ArrowLeftIcon, MapIcon, SearchIcon } from '@/components/Icons';

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
export type DoctorDetails = Omit<Doctor, 'reviews'> & { reviews?: (PublicReview | Record<string, unknown>)[] };
export type BranchDetails = Omit<Branch, 'amenities'> & Partial<Pick<CanonicalBranch, 'openingTime' | 'closingTime' | 'latitude' | 'longitude' | 'galleryUrls'>> & { amenities?: ContentItem[] };

const contentText = (item: ContentItem, field: string) => typeof item === 'string' ? item : typeof item[field] === 'string' ? item[field] as string : '';

const buttonClass = 'rounded-[8px] border border-[#DED2C5] bg-white px-3 py-2 text-xs font-semibold text-[#98501B] disabled:opacity-50';
const inputClass = 'mt-1 h-10 w-full min-w-0 rounded-[8px] border border-[#DED2C5] bg-white px-3 text-xs text-[#40352F]';

export const EntityImage: React.FC<{ src?: string | null; alt: string; className?: string }> = ({ src, alt, className = 'h-44 w-full' }) => {
  const [failedSource, setFailedSource] = React.useState<string | null>(null);
  return src && failedSource !== src
    ? <img src={src} alt={alt} onError={() => setFailedSource(src)} className={className + ' rounded-[8px] object-cover'} />
    : <div className={className + ' flex items-center justify-center rounded-[8px] bg-stone-100 p-3 text-center text-xs text-stone-500'}>Chưa có hình ảnh</div>;
};

export const BranchHours: React.FC<{ branch: BranchDetails }> = ({ branch }) => (
  <p className="text-xs text-stone-600">Giờ hoạt động: {branch.openingTime && branch.closingTime
    ? branch.openingTime + ' - ' + branch.closingTime : 'Chưa cập nhật'}</p>
);

const MapLink: React.FC<{ branch: BranchDetails }> = ({ branch }) => {
  const latitude = branch.latitude == null ? NaN : Number(branch.latitude);
  const longitude = branch.longitude == null ? NaN : Number(branch.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const destination = hasCoordinates ? latitude + ',' + longitude : branch.address?.trim();
  return destination
    ? <a href={'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destination)} target="_blank" rel="noopener noreferrer" className={buttonClass + ' inline-flex items-center gap-2'}><MapIcon size={14} />Mở bản đồ</a>
    : <p className="text-stone-500">Chưa có vị trí chi nhánh.</p>;
};

const DetailScreen: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, onClose, children, footer }) => (
  <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#FAF6F0] text-[#40352F]">
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
    {!reviews?.length ? <p className="text-stone-500">Chưa có đánh giá được cung cấp.</p> : reviews.map((review, index) => (
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
  onClose: () => void;
  onSelectBranch: (branch: Branch) => void;
}> = ({ branches, onClose, onSelectBranch }) => {
  const [query, setQuery] = React.useState('');
  const [city, setCity] = React.useState('');
  const cities = Array.from(new Set(branches.map(branch => branch.city).filter(Boolean)));
  const results = branches.filter(branch => (!city || branch.city === city)
    && (branch.name + ' ' + branch.address).toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  return <DetailScreen title="Hệ thống chi nhánh" onClose={onClose}>
    <label className="block">Tìm chi nhánh<input value={query} onChange={event => setQuery(event.target.value)} className={inputClass} placeholder="Tên hoặc địa chỉ..." /></label>
    <label className="block">Tỉnh / thành phố<select value={city} onChange={event => setCity(event.target.value)} className={inputClass}><option value="">Tất cả</option>{cities.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
    <p>{results.length} chi nhánh</p>
    {!results.length && <p className="text-stone-500">Không có chi nhánh phù hợp.</p>}
    {results.map(branch => <button key={branch.id} onClick={() => onSelectBranch(branch)} className="w-full space-y-2 rounded-[8px] border border-[#DED2C5] bg-white p-3 text-left">
      <h2 className="font-bold">{branch.name}</h2><EntityImage src={branch.imageUrl} alt={branch.name} /><p>{branch.address || 'Chưa cập nhật địa chỉ'}</p><BranchHours branch={branch} />
    </button>)}
  </DetailScreen>;
};

export const SpecialistDirectoryModal: React.FC<{
  doctors: DoctorDetails[];
  onClose: () => void;
  onSelectDoctor: (doctor: Doctor) => void;
}> = ({ doctors, onClose, onSelectDoctor }) => {
  const [query, setQuery] = React.useState('');
  const [branch, setBranch] = React.useState('');
  const [specialty, setSpecialty] = React.useState('');
  const [sort, setSort] = React.useState('name');
  const branches = Array.from(new Set(doctors.map(doctor => doctor.hospital).filter(Boolean)));
  const specialties = Array.from(new Set(doctors.map(doctor => doctor.specialty).filter(Boolean)));
  const results = doctors.filter(doctor => (doctor.name + ' ' + doctor.title + ' ' + doctor.specialty).toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))
    && (!branch || doctor.hospital === branch) && (!specialty || doctor.specialty === specialty))
    .sort((a, b) => sort === 'rating' ? (b.rating ?? 0) - (a.rating ?? 0) : a.name.localeCompare(b.name, 'vi'));
  return <DetailScreen title="Đội ngũ chuyên viên" onClose={onClose}>
    <label className="block"><span className="flex items-center gap-2"><SearchIcon size={16} />Tìm chuyên viên</span><input value={query} onChange={event => setQuery(event.target.value)} className={inputClass} /></label>
    <div className="grid grid-cols-2 gap-2">
      <label>Chi nhánh<select value={branch} onChange={event => setBranch(event.target.value)} className={inputClass}><option value="">Tất cả</option>{branches.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Chuyên môn<select value={specialty} onChange={event => setSpecialty(event.target.value)} className={inputClass}><option value="">Tất cả</option>{specialties.map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
    <label className="block">Sắp xếp<select value={sort} onChange={event => setSort(event.target.value)} className={inputClass}><option value="name">Theo tên</option><option value="rating">Đánh giá cao nhất</option></select></label>
    <p>{results.length} chuyên viên phù hợp</p>
    {!results.length && <p className="text-stone-500">Không tìm thấy chuyên viên phù hợp.</p>}
    {results.map(doctor => <button key={doctor.id} onClick={() => onSelectDoctor(doctor)} className="w-full space-y-2 rounded-[8px] border border-[#DED2C5] bg-white p-3 text-left">
      <h2 className="font-bold">{doctor.name}</h2><p>{doctor.title}</p><EntityImage src={doctor.avatar} alt={doctor.name} /><p>{doctor.specialty}</p>
      {doctor.reviewsCount > 0 && <p>{doctor.rating}/5 ({doctor.reviewsCount} đánh giá)</p>}
      {doctor.experienceYears != null && <p>{doctor.experienceYears} năm kinh nghiệm</p>}
    </button>)}
  </DetailScreen>;
};

export const ServiceDetailModal: React.FC<{
  service: ServiceDetails | null;
  onClose: () => void;
  onBookNow: (service: MedicalService) => void;
}> = ({ service, onClose, onBookNow }) => {
  if (!service) return null;
  return <DetailScreen title={service.title} onClose={onClose} footer={<><span className="font-bold">{service.price.toLocaleString('vi-VN')} ₫</span><button onClick={() => onBookNow(service)} className={buttonClass}>Đặt lịch ngay</button></>}>
    <EntityImage src={service.image} alt={service.title} />
    <p>{service.category} · {service.durationMinutes} phút</p>
    {service.reviewsCount > 0 && Number.isFinite(service.rating) && <p>{service.rating}/5 ({service.reviewsCount} đánh giá)</p>}
    {service.originalPrice != null && service.originalPrice > service.price && <p className="line-through">{service.originalPrice.toLocaleString('vi-VN')} ₫</p>}
    <section><h2 className="mb-2 font-bold">Giới thiệu dịch vụ</h2><p className="whitespace-pre-line">{service.description || 'Chưa cập nhật mô tả.'}</p></section>
    <section className="space-y-2"><h2 className="font-bold">Lợi ích</h2>{service.benefits?.length ? <ul className="list-inside list-disc space-y-1">{service.benefits.map((benefit, index) => <li key={index}>{contentText(benefit, 'title') || contentText(benefit, 'description')}</li>)}</ul> : <p className="text-stone-500">Chưa cập nhật lợi ích.</p>}</section>
    <section className="space-y-2"><h2 className="font-bold">Quy trình trải nghiệm</h2>{service.steps?.length ? service.steps.map((step, index) => <div key={index} className="border-b border-[#EADECF] py-2"><h3 className="font-semibold">{typeof step !== 'string' && typeof step.step === 'number' ? step.step + '. ' : ''}{contentText(step, 'title')}</h3>{typeof step !== 'string' && <p className="whitespace-pre-line">{contentText(step, 'desc') || contentText(step, 'description')}</p>}</div>) : <p className="text-stone-500">Chưa cập nhật quy trình.</p>}</section>
    <Gallery urls={service.galleryUrls} name={service.title} /><Reviews reviews={service.reviews} />
  </DetailScreen>;
};

export const SpecialistDetailModal: React.FC<{
  doctor: DoctorDetails | null;
  onClose: () => void;
  onBookWithDoctor: (doctor: Doctor) => void;
}> = ({ doctor, onClose, onBookWithDoctor }) => {
  if (!doctor) return null;
  return <DetailScreen title={doctor.name} onClose={onClose} footer={<button onClick={() => onBookWithDoctor(doctor)} className={buttonClass + ' w-full whitespace-normal'}>Đặt lịch với chuyên viên {doctor.name}</button>}>
    <EntityImage src={doctor.avatar} alt={doctor.name} /><p>{doctor.title}</p><p>{doctor.hospital}</p>
    {doctor.reviewsCount > 0 && <p>{doctor.rating}/5 ({doctor.reviewsCount} đánh giá)</p>}
    <section><h2 className="mb-2 font-bold">Giới thiệu</h2><p className="whitespace-pre-line">{doctor.bio || 'Chưa cập nhật giới thiệu.'}</p></section>
    <p>Chuyên môn: {doctor.specialty || 'Chưa cập nhật'}</p>
    <p>Kinh nghiệm: {doctor.experienceYears != null ? doctor.experienceYears + ' năm' : 'Chưa cập nhật'}</p>
    <Reviews reviews={doctor.reviews} />
  </DetailScreen>;
};

export const BranchDetailModal: React.FC<{
  branch: BranchDetails | null;
  onClose: () => void;
  onSelectBranch: (branch: Branch) => void;
  onOpenDirections?: (branch: Branch) => void;
}> = ({ branch, onClose, onSelectBranch, onOpenDirections }) => {
  if (!branch) return null;
  return <DetailScreen title={branch.name} onClose={onClose} footer={<>
    {onOpenDirections ? <button onClick={() => onOpenDirections(branch)} className={buttonClass}>Chỉ đường</button> : <MapLink branch={branch} />}
    <button onClick={() => onSelectBranch(branch)} className={buttonClass}>Đặt lịch tại cơ sở này</button>
  </>}>
    <EntityImage src={branch.imageUrl} alt={branch.name} /><p>{branch.address || 'Chưa cập nhật địa chỉ'}</p>
    {branch.phone && <a className="block text-[#98501B]" href={'tel:' + branch.phone}>Hotline: {branch.phone}</a>}
    <BranchHours branch={branch} />
    <section className="space-y-2"><h2 className="font-bold">Tiện nghi</h2>{branch.amenities?.length ? <ul className="list-inside list-disc">{branch.amenities.map((amenity, index) => <li key={index}>{contentText(amenity, 'name') || contentText(amenity, 'title')}</li>)}</ul> : <p className="text-stone-500">Chưa cập nhật tiện nghi.</p>}</section>
    <Gallery urls={branch.galleryUrls} name={branch.name} />
  </DetailScreen>;
};

export const LocationDirectionsModal: React.FC<{
  branch: BranchDetails | null;
  onClose: () => void;
  onBookAtBranch?: (branch: Branch) => void;
}> = ({ branch, onClose, onBookAtBranch }) => {
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
  return <DetailScreen title="Chỉ đường đến cơ sở" onClose={onClose} footer={onBookAtBranch && <button onClick={() => { onClose(); onBookAtBranch(branch); }} className={buttonClass}>Đặt lịch tại cơ sở này</button>}>
    <h2 className="text-sm font-bold">{branch.name}</h2><p>{branch.address || 'Chưa cập nhật địa chỉ'}</p>
    {branch.phone && <a className="block" href={'tel:' + branch.phone}>Hotline: {branch.phone}</a>}
    <BranchHours branch={branch} /><MapLink branch={branch} />
    {branch.address && <button onClick={handleCopy} className={buttonClass}>Sao chép địa chỉ</button>}
    {copyStatus && <p role="status">{copyStatus}</p>}
  </DetailScreen>;
};

