import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { ArrowLeftIcon, ArrowRightIcon, BookOpenIcon, LeafIcon } from '@/components/Icons';
import { ZaloProfileForm, RegistrationChallenge, ProfileDraft } from './ZaloProfileForm';
import type { User } from '../../../../backend/src/data/database';
import careImage from '@/static/onboarding-care.jpg';
import academyImage from '@/static/onboarding-academy.jpg';
import '@/css/onboarding.scss';

export function NewCustomerOnboarding({ challenge, onComplete, onBack }: {
  challenge: RegistrationChallenge;
  onComplete: (user: User) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<'care' | 'growth' | 'profile' | 'interests'>('care');
  const [draft, setDraft] = useState<ProfileDraft>({
    fullName: challenge.suggestedName || '', avatarUrl: challenge.suggestedAvatar || '',
    email: '', dateOfBirth: '', gender: 'OTHER',
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const submitting = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (container.current) container.current.scrollTop = 0;
    container.current?.querySelector('h1')?.focus({ preventScroll: true });
  }, [step]);
  const finish = async () => {
    if (submitting.current || !interests.length || expired) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const purpose = interests.length === 2 ? 'BOTH' : interests[0];
      const result = await apiClient.registerZaloProfile(challenge.registrationToken, { ...draft, purpose });
      if (result?.user && result.token) { onComplete(result.user); return; }
      if (result?.status === 401) setExpired(true);
      setError(result?.status === 401 ? 'Phiên xác minh đã hết hạn. Vui lòng xác minh số điện thoại lại.' : result?.error || 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally { submitting.current = false; setBusy(false); }
  };
  return (
    <div ref={container} className="new-customer-flow" role="dialog" aria-modal="true" aria-label="Chào mừng khách hàng mới">
      {step === 'profile' ? <ZaloProfileForm challenge={challenge} draft={draft} onBack={profile => { setDraft(profile); setStep('growth'); }}
        onContinue={profile => { setDraft(profile); setStep('interests'); }} />
      : step === 'interests' ? (
        <section className="new-customer-page interest-page" aria-labelledby="interest-heading">
          <header className="onboarding-topbar"><button type="button" className="onboarding-back" onClick={() => setStep('profile')} disabled={busy} aria-label="Quay lại hồ sơ" title="Quay lại hồ sơ"><ArrowLeftIcon size={20} /></button><span>DÀNH RIÊNG CHO BẠN</span></header>
          <span className="onboarding-brand">MLD <strong>Việt Nam</strong></span>
          <h1 id="interest-heading" tabIndex={-1}>Bạn quan tâm đến điều gì?</h1>
          <p className="onboarding-description">Chọn những điều bạn yêu thích để bắt đầu hành trình cùng MLD.</p>
          <div className="interest-options">
            {[
              { value: 'BEAUTY_SPA', title: 'Chăm sóc sức khỏe & sắc đẹp', text: 'Thư giãn, chăm sóc và trị liệu chuyên nghiệp.', image: careImage, Icon: LeafIcon },
              { value: 'ACADEMY', title: 'Học tập & phát triển nghề nghiệp', text: 'Khóa học chuyên môn, vững bước tương lai.', image: academyImage, Icon: BookOpenIcon },
            ].map(({ value, title, text, image, Icon }) => (
              <label className={`interest-option ${interests.includes(value) ? 'is-selected' : ''}`} key={value}>
                <img src={image} alt="" />
                <span className="interest-option-copy"><Icon size={20} /><strong>{title}</strong><span>{text}</span></span>
                <input type="checkbox" aria-label={title} checked={interests.includes(value)} disabled={busy || expired}
                  onChange={event => setInterests(current => event.target.checked ? [...current, value] : current.filter(item => item !== value))} />
              </label>
            ))}
          </div>
          {error && <p role="alert" className="onboarding-error">{error}</p>}
          <div className="onboarding-footer">
            {expired ? <button className="onboarding-primary" onClick={onBack}>Xác minh lại số điện thoại</button>
              : <button className="onboarding-primary" onClick={finish} disabled={busy || !interests.length} aria-busy={busy}>{busy ? 'Đang lưu hồ sơ...' : 'Khám phá ứng dụng'}<ArrowRightIcon size={18} /></button>}
          </div>
        </section>
      ) : (
        <section className="new-customer-page intro-page" aria-labelledby="intro-heading">
          <header className="onboarding-topbar"><button type="button" className="onboarding-back" onClick={() => step === 'growth' ? setStep('care') : onBack()} aria-label="Quay lại" title="Quay lại"><ArrowLeftIcon size={20} /></button><span>CHĂM SÓC & PHÁT TRIỂN</span><button type="button" className="onboarding-skip" onClick={() => setStep('profile')}>Bỏ qua</button></header>
          <div className="intro-visual"><img src={step === 'care' ? careImage : academyImage} alt={step === 'care' ? 'Không gian chăm sóc và thư giãn' : 'Không gian học tập và phát triển chuyên môn'} /></div>
          <div className="intro-progress" aria-label={step === 'care' ? 'Giới thiệu 1 trên 2' : 'Giới thiệu 2 trên 2'}><span className={step === 'care' ? 'is-active' : ''} /><span className={step === 'growth' ? 'is-active' : ''} /></div>
          <span className="onboarding-brand">MLD <strong>Việt Nam</strong></span>
          <h1 id="intro-heading" tabIndex={-1}>{step === 'care' ? 'Chăm sóc sức khỏe mỗi ngày' : 'Phát triển nghề nghiệp cùng bạn'}</h1>
          <p className="onboarding-description">{step === 'care' ? 'Trải nghiệm các dịch vụ spa, thư giãn và chăm sóc sức khỏe chuyên nghiệp.' : 'Bồi dưỡng kiến thức, nâng cao tay nghề và mở ra cơ hội mới với các khóa học chuyên môn.'}</p>
          <div className="onboarding-footer"><button type="button" className="onboarding-primary" onClick={() => setStep(step === 'care' ? 'growth' : 'profile')}>Tiếp tục<ArrowRightIcon size={18} /></button></div>
        </section>
      )}
    </div>
  );
}
