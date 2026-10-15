import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { User } from '../../../../backend/src/data/database';
import { CloseIcon, LeafIcon } from '@/components/Icons';
import { ZaloProfileForm, RegistrationChallenge } from '@/components/ZaloProfileForm';

interface GroupAAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  canClose?: boolean;
}

export const GroupAAuthModal: React.FC<GroupAAuthModalProps> = ({
  isOpen, onClose, onLoginSuccess, canClose = false,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [registration, setRegistration] = useState<RegistrationChallenge | null>(null);
  const attempt = useRef(0);

  useEffect(() => {
    attempt.current++;
    setBusy(false);
    setError('');
    setRegistration(null);
    return () => { attempt.current++; };
  }, [isOpen]);

  if (!isOpen) return null;
  if (registration) return <ZaloProfileForm challenge={registration} onBack={() => setRegistration(null)}
    onComplete={user => { onLoginSuccess(user); onClose(); }} />;

  const login = async () => {
    if (busy) return;
    const current = ++attempt.current;
    setBusy(true);
    setError('');
    const result = await apiClient.loginWithZalo(true);
    if (current !== attempt.current) return;
    setBusy(false);
    if (result?.registrationRequired && result.registrationToken) {
      setRegistration({ registrationToken: result.registrationToken, phone: result.phone });
      return;
    }
    if (!result?.user || !result.token) {
      setError(result?.error || 'Không thể đăng nhập Zalo. Vui lòng thử lại.');
      return;
    }
    onLoginSuccess(result.user);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="zalo-login-title"
      className="absolute inset-0 z-50 flex flex-col overflow-y-auto bg-[#FAF6F0] p-6">
      {canClose && (
        <button type="button" onClick={onClose} disabled={busy} title="Đóng" aria-label="Đóng"
          className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center text-stone-600 disabled:opacity-50">
          <CloseIcon size={18} color="#40352F" />
        </button>
      )}
      <div className="mx-auto my-auto w-full max-w-sm py-8 text-center">
        <div className="mb-5 flex justify-center"><LeafIcon size={48} color="#98501B" /></div>
        <p className="mb-2 text-sm font-semibold text-[#98501B]">MLD Việt Nam</p>
        <h2 id="zalo-login-title" className="text-xl font-bold text-stone-800">Đăng nhập</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">Chia sẻ số điện thoại Zalo để kết nối hồ sơ và liên hệ đặt lịch.</p>
        {error && <p role="alert" className="mt-4 break-words text-sm text-red-700">{error}</p>}
        <button type="button" onClick={login} disabled={busy} aria-busy={busy}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0068FF] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {busy && <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {busy ? 'Đang đăng nhập...' : 'Tiếp tục với Zalo'}
        </button>
      </div>
    </div>
  );
};
