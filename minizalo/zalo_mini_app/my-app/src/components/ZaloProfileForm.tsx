import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { readAvatar } from '@/utils/read-avatar';
import { ArrowLeftIcon, CameraIcon, CheckIcon, NavProfileIcon } from '@/components/Icons';
import '@/css/profile-onboarding.scss';

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
  const readController = useRef<AbortController | null>(null);
  const profileGeneration = useRef(0);
  useEffect(() => () => { profileGeneration.current++; readController.current?.abort(); }, []);
  const change = (key: keyof ProfileDraft, value: string) => setProfile(current => ({ ...current, [key]: value }));
  const chooseAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    readController.current?.abort();
    const controller = new AbortController(), generation = ++profileGeneration.current;
    readController.current = controller;
    setReadingImage(true);
    setImageError('');
    try {
      const avatar = await readAvatar(file,controller.signal);
      if (generation === profileGeneration.current) change('avatarUrl',avatar);
    }
    catch (error) { if(generation === profileGeneration.current) setImageError(error instanceof Error ? error.message : 'Không thể đọc ảnh.'); }
    finally { if(generation === profileGeneration.current) setReadingImage(false); }
  };
  const importProfile = async () => {
    if (readingImage) return;
    const generation = ++profileGeneration.current;
    setReadingImage(true); setImageError('');
    try {
      const result = await apiClient.getZaloProfile();
      if (generation === profileGeneration.current) setProfile(current => ({...current,fullName:result.name || current.fullName,avatarUrl:result.avatar || current.avatarUrl}));
    } catch { if(generation === profileGeneration.current) setImageError('Chưa lấy được tên và ảnh Zalo. Bạn vẫn có thể tự điền thông tin.'); }
    finally { if(generation === profileGeneration.current) setReadingImage(false); }
  };
  return (
    <section className="new-customer-page profile-page" aria-labelledby="profile-heading">
      <div className="profile-page-content">
      <header className="onboarding-topbar">
        <button type="button" onClick={() => onBack(profile)} aria-label="Quay lại" title="Quay lại" className="onboarding-back"><ArrowLeftIcon size={20} /></button>
        <span>HỒ SƠ CÁ NHÂN</span>
      </header>
      <h1 id="profile-heading" tabIndex={-1}>Hoàn thiện hồ sơ</h1>
      <p className="onboarding-description">Vui lòng cập nhật thông tin để chúng tôi phục vụ bạn tốt hơn.</p>
      <form className="profile-form" onSubmit={event => { event.preventDefault(); if (!readingImage && profile.fullName.trim()) onContinue({ ...profile, fullName: profile.fullName.trim() }); }}>
        <div className="profile-avatar-row">
          <button type="button" className="profile-avatar" onClick={() => input.current?.click()} disabled={readingImage} aria-label="Thay ảnh đại diện" title="Thay ảnh đại diện">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Ảnh đại diện" onError={() => change('avatarUrl', '')} /> : <NavProfileIcon size={32} />}
            <span className="profile-camera"><CameraIcon size={14} /></span>
          </button>
          <div><button className="profile-photo-label" type="button" onClick={() => input.current?.click()} disabled={readingImage}>{readingImage ? 'Đang xử lý ảnh...' : profile.avatarUrl ? 'Thay ảnh đại diện' : 'Thêm ảnh đại diện'}</button><p>Có thể cập nhật sau</p>{imageError && <p role="alert" className="profile-upload-error">{imageError}</p>}</div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} hidden />
        </div>
        <div className="profile-form-fields">
        <button type="button" className="profile-photo-label" disabled={readingImage} onClick={() => void importProfile()}>Lấy tên và ảnh từ Zalo</button>
        <label className="profile-field">Họ và tên <span className="profile-required">*</span>
          <input value={profile.fullName} onChange={event => change('fullName', event.target.value)} maxLength={150} autoComplete="name" required placeholder="Nhập họ và tên" aria-required="true" />
        </label>
        <label className="profile-field">Số điện thoại
          <div className="profile-verified"><input value={challenge.phone} readOnly type="tel" aria-label="Số điện thoại đã xác minh" /><span className="profile-verified-mark" aria-hidden="true"><CheckIcon size={12} color="#40956B" /></span></div>
        </label>
        <div className="profile-two-columns">
          <label className="profile-field">Ngày sinh
            <input value={profile.dateOfBirth} onChange={event => change('dateOfBirth', event.target.value)} type="date" max={new Date(Date.now()+7*60*60*1000).toISOString().slice(0, 10)} />
          </label>
          <label className="profile-field">Giới tính
            <select value={profile.gender} onChange={event => change('gender', event.target.value)}>
              <option value="">Chưa chọn</option><option value="FEMALE">Nữ</option><option value="MALE">Nam</option><option value="OTHER">Khác</option>
            </select>
          </label>
        </div>
        <label className="profile-field">Email
          <input value={profile.email} onChange={event => change('email', event.target.value)} type="email" inputMode="email" autoComplete="email" maxLength={255} placeholder="Nhập địa chỉ email" />
        </label>
        </div>
        <div className="profile-form-actions">
        <p className="profile-optional">* Bắt buộc. Ngày sinh, giới tính và email là tùy chọn.</p>
        <button type="submit" disabled={readingImage || !profile.fullName.trim()} className="onboarding-primary">Lưu và tiếp tục</button>
        </div>
      </form>
      </div>
    </section>
  );
}
