import React, { useState } from 'react';
import { apiClient } from '@/api/client';
import type { User } from '../../../../backend/src/data/database';

export interface RegistrationChallenge { registrationToken: string; phone: string; }

export function ZaloProfileForm({ challenge, onComplete, onBack }: {
  challenge: RegistrationChallenge; onComplete: (user: User) => void; onBack: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('OTHER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError('');
    const result = await apiClient.registerZaloProfile(challenge.registrationToken, {
      fullName: name.trim(), email: email.trim(), dateOfBirth: dob, gender,
    });
    setBusy(false);
    if (result?.user && result.token) { onComplete(result.user); return; }
    if (result?.status === 401) {
      setExpired(true);
      setError('Phiên xác minh đã hết hạn. Vui lòng xác minh số điện thoại lại.');
    } else setError(result?.error || 'Không thể lưu hồ sơ. Vui lòng thử lại.');
  };
  const field = 'mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800';
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="registration-title"
      className="absolute inset-0 z-[110] overflow-y-auto bg-[#FAF6F0] px-6 pb-8 pt-16">
      <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-4">
        <h2 id="registration-title" className="text-xl font-bold text-stone-800">Thông tin cá nhân</h2>
        <label className="block text-sm text-stone-700">Số điện thoại đã xác minh
          <input value={challenge.phone} readOnly type="tel" className={`${field} bg-stone-100`} />
        </label>
        <label className="block text-sm text-stone-700">Họ và tên <span className="text-red-700">*</span>
          <input value={name} onChange={e => setName(e.target.value)} required maxLength={150} autoComplete="name" className={field} disabled={busy || expired} />
        </label>
        <label className="block text-sm text-stone-700">Ngày sinh
          <input value={dob} onChange={e => setDob(e.target.value)} type="date" max={new Date().toISOString().slice(0,10)} className={field} disabled={busy || expired} />
        </label>
        <label className="block text-sm text-stone-700">Giới tính
          <select value={gender} onChange={e => setGender(e.target.value)} className={field} disabled={busy || expired}>
            <option value="OTHER">Khác / Không cung cấp</option><option value="FEMALE">Nữ</option><option value="MALE">Nam</option>
          </select>
        </label>
        <label className="block text-sm text-stone-700">Email
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" maxLength={255} autoComplete="email" className={field} disabled={busy || expired} />
        </label>
        {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy || expired || !name.trim()} className="min-h-12 w-full rounded-lg bg-[#0068FF] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Đang lưu...' : 'Hoàn tất'}
        </button>
        <button type="button" onClick={onBack} disabled={busy} className="min-h-11 w-full text-sm font-semibold text-stone-600 disabled:opacity-50">
          {expired ? 'Xác minh lại' : 'Quay lại'}
        </button>
      </form>
    </div>
  );
}
