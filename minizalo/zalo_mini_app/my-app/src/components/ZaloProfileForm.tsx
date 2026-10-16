import React, { useRef, useState } from 'react';
import { ArrowLeftIcon, CameraIcon, CheckIcon, NavProfileIcon } from '@/components/Icons';

export interface RegistrationChallenge {
  registrationToken: string;
  phone: string;
  suggestedName?: string;
  suggestedAvatar?: string;
}

export interface ProfileDraft {
  fullName: string;
  avatarUrl: string;
  email: string;
  dateOfBirth: string;
  gender: string;
}

async function readAvatar(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WebP không quá 10 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Không thể đọc ảnh. Vui lòng chọn ảnh khác.'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 360;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Thiết bị chưa hỗ trợ xử lý ảnh.');
    const edge = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(image, (image.naturalWidth - edge) / 2, (image.naturalHeight - edge) / 2, edge, edge, 0, 0, 360, 360);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}

export function ZaloProfileForm({ challenge, draft, onContinue, onBack }: {
  challenge: RegistrationChallenge;
  draft: ProfileDraft;
  onContinue: (profile: ProfileDraft) => void;
  onBack: (profile: ProfileDraft) => void;
}) {
  const [profile, setProfile] = useState(draft);
  const [readingImage, setReadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const change = (key: keyof ProfileDraft, value: string) => setProfile(current => ({ ...current, [key]: value }));
  const chooseAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setReadingImage(true);
    setImageError('');
    try { change('avatarUrl', await readAvatar(file)); }
    catch (error) { setImageError(error instanceof Error ? error.message : 'Không thể đọc ảnh.'); }
    finally { setReadingImage(false); }
  };
  return (
    <section className="new-customer-page profile-page" aria-labelledby="profile-heading">
      <header className="onboarding-topbar">
        <button type="button" onClick={() => onBack(profile)} aria-label="Quay lại" title="Quay lại" className="onboarding-back"><ArrowLeftIcon size={20} /></button>
        <span>HỒ SƠ CÁ NHÂN</span>
      </header>
      <h1 id="profile-heading" tabIndex={-1}>Hoàn thiện hồ sơ</h1>
      <p className="onboarding-description">Vui lòng cập nhật thông tin để chúng tôi phục vụ bạn tốt hơn.</p>
      <form onSubmit={event => { event.preventDefault(); if (!readingImage && profile.fullName.trim()) onContinue({ ...profile, fullName: profile.fullName.trim() }); }}>
        <div className="profile-avatar-row">
          <button type="button" className="profile-avatar" onClick={() => input.current?.click()} disabled={readingImage} aria-label="Thay ảnh đại diện" title="Thay ảnh đại diện">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Ảnh đại diện" onError={() => change('avatarUrl', '')} /> : <NavProfileIcon size={32} />}
            <span className="profile-camera"><CameraIcon size={14} /></span>
          </button>
          <div><button className="profile-photo-label" type="button" onClick={() => input.current?.click()} disabled={readingImage}>{readingImage ? 'Đang xử lý ảnh...' : profile.avatarUrl ? 'Thay ảnh đại diện' : 'Thêm ảnh đại diện'}</button><p>Có thể cập nhật sau</p></div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} hidden />
        </div>
        {imageError && <p role="alert" className="onboarding-error">{imageError}</p>}
        <label className="profile-field">Họ và tên <span className="profile-required">*</span>
          <input value={profile.fullName} onChange={event => change('fullName', event.target.value)} maxLength={150} autoComplete="name" required placeholder="Nhập họ và tên" />
        </label>
        <label className="profile-field">Số điện thoại
          <div className="profile-verified"><input value={challenge.phone} readOnly type="tel" aria-label="Số điện thoại đã xác minh" /><CheckIcon size={17} color="#40956B" /></div>
        </label>
        <div className="profile-two-columns">
          <label className="profile-field">Ngày sinh
            <input value={profile.dateOfBirth} onChange={event => change('dateOfBirth', event.target.value)} type="date" max={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="profile-field">Giới tính
            <select value={profile.gender} onChange={event => change('gender', event.target.value)}>
              <option value="">Chưa chọn</option><option value="FEMALE">Nữ</option><option value="MALE">Nam</option><option value="OTHER">Khác</option>
            </select>
          </label>
        </div>
        <label className="profile-field">Email
          <input value={profile.email} onChange={event => change('email', event.target.value)} type="email" autoComplete="email" maxLength={255} placeholder="Nhập địa chỉ email" />
        </label>
        <p className="profile-optional">* Bắt buộc. Ngày sinh, giới tính và email là tùy chọn.</p>
        <button type="submit" disabled={readingImage || !profile.fullName.trim()} className="onboarding-primary">Lưu và tiếp tục</button>
      </form>
    </section>
  );
}
