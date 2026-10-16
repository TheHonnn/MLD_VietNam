import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/Icons';
import { ZaloProfileForm, RegistrationChallenge, ProfileDraft } from './ZaloProfileForm';
import type { User } from '../../../../backend/src/data/database';
import type { PurposeInterest } from '../../../../../database/shared_types';
import academyImage from '@/static/onboarding-academy.jpg';
import '@/css/onboarding.scss';
import { CareIntroScreen } from './CareIntroScreen';
import { InterestSelectionScreen } from './InterestSelectionScreen';

export function NewCustomerOnboarding({ challenge, onComplete, onBack, initialStep = 'care' }: {
  challenge: RegistrationChallenge;
  onComplete: (user: User) => void;
  onBack: () => void;
  initialStep?: 'care' | 'growth';
}) {
  const [step, setStep] = useState<'care' | 'growth' | 'profile' | 'interests'>(initialStep);
  const [draft, setDraft] = useState<ProfileDraft>({
    fullName: challenge.suggestedName || '', avatarUrl: challenge.suggestedAvatar || '',
    email: '', dateOfBirth: '', gender: '',
  });
  const [purpose, setPurpose] = useState<PurposeInterest | null>(null);
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
    if (submitting.current || !purpose || expired) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await apiClient.registerZaloProfile(challenge.registrationToken, { ...draft, purpose });
      if (result?.user && result.token) { onComplete(result.user); return; }
      if (result?.status === 401) setExpired(true);
      setError(result?.status === 401 ? 'Phiên xác minh đã hết hạn. Vui lòng xác minh số điện thoại lại.' : result?.error || 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } catch { setError('Không thể lưu hồ sơ. Vui lòng thử lại.'); }
    finally { submitting.current = false; setBusy(false); }
  };
  return (
    <div ref={container} className="new-customer-flow" role="dialog" aria-modal="true" aria-label="Chào mừng khách hàng mới">
      {step === 'profile' ? <ZaloProfileForm challenge={challenge} draft={draft} onBack={profile => { setDraft(profile); setStep('growth'); }}
        onContinue={profile => { setDraft(profile); setStep('interests'); }} />
      : step === 'interests' ? <InterestSelectionScreen value={purpose} onChange={setPurpose}
        onBack={() => setStep('profile')} onExplore={finish} onVerifyAgain={onBack}
        busy={busy} expired={expired} error={error} />
      : step === 'care' ? <CareIntroScreen onContinue={() => setStep('growth')} onSkip={() => setStep('profile')} /> : (
        <section className="new-customer-page intro-page" aria-labelledby="intro-heading">
          <header className="onboarding-topbar"><button type="button" className="onboarding-back" onClick={() => setStep('care')} aria-label="Quay lại" title="Quay lại"><ArrowLeftIcon size={20} /></button><span>CHĂM SÓC & PHÁT TRIỂN</span><button type="button" className="onboarding-skip" onClick={() => setStep('profile')}>Bỏ qua</button></header>
          <div className="intro-visual"><img src={academyImage} alt="Không gian học tập và phát triển chuyên môn" /></div>
          <div className="intro-progress" aria-label="Giới thiệu 2 trên 3"><span /><span className="is-active" /><span /></div>
          <span className="onboarding-brand">MLD <strong>Việt Nam</strong></span>
          <h1 id="intro-heading" tabIndex={-1}>Phát triển nghề nghiệp cùng bạn</h1>
          <p className="onboarding-description">Bồi dưỡng kiến thức, nâng cao tay nghề và mở ra cơ hội mới với các khóa học chuyên môn.</p>
          <div className="onboarding-footer"><button type="button" className="onboarding-primary" onClick={() => setStep('profile')}>Tiếp tục<ArrowRightIcon size={18} /></button></div>
        </section>
      )}
    </div>
  );
}
