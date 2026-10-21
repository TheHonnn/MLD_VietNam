import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { ZaloProfileForm, RegistrationChallenge, ProfileDraft } from './ZaloProfileForm';
import type { User } from '../../../../backend/src/data/database';
import type { PurposeInterest } from '../../../../../database/shared_types';
import '@/css/onboarding.scss';
import { CareIntroScreen } from './CareIntroScreen';
import { InterestSelectionScreen } from './InterestSelectionScreen';
import { useBackAction } from '@/hooks/useNavigationHistory';

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
  const registrationRequest = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current=true;
    return () => { mounted.current=false;registrationRequest.current?.abort(); };
  },[challenge.registrationToken]);
  useBackAction(true,()=>{
    if(submitting.current)return;
    if(step==='interests')setStep('profile');
    else if(step==='profile')setStep('growth');
    else onBack();
  },3);
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
    const controller=new AbortController();
    registrationRequest.current=controller;
    try {
      const result = await apiClient.registerZaloProfile(challenge.registrationToken, { ...draft, purpose },controller.signal);
      if(!mounted.current||controller.signal.aborted)return;
      if (result?.user && result.token) { onComplete(result.user); return; }
      if (result?.status === 401) setExpired(true);
      setError(result?.status === 401 ? 'Phiên xác minh đã hết hạn. Vui lòng xác minh số điện thoại lại.' : result?.error || 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } catch { if(mounted.current&&!controller.signal.aborted)setError('Không thể lưu hồ sơ. Vui lòng thử lại.'); }
    finally { submitting.current = false; if(mounted.current)setBusy(false); }
  };
  return (
    <div ref={container} className="new-customer-flow" role="dialog" aria-modal="true" aria-label="Chào mừng khách hàng mới">
      {step === 'profile' ? <ZaloProfileForm challenge={challenge} draft={draft} onBack={profile => { setDraft(profile); setStep('growth'); }}
        onContinue={profile => { setDraft(profile); setStep('interests'); }} />
      : step === 'interests' ? <InterestSelectionScreen value={purpose} onChange={setPurpose}
        onBack={() => setStep('profile')} onExplore={finish} onVerifyAgain={onBack}
        busy={busy} expired={expired} error={error} />
      : <CareIntroScreen initialIndex={step === 'growth' ? 1 : 0} onContinue={() => setStep('profile')} onSkip={() => setStep('profile')} />}
    </div>
  );
}
