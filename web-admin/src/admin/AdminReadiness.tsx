import React, { useEffect, useState } from 'react';
import { adminCommand } from './api';
import { useAdmin } from './Auth';

export function AdminReadiness() {
  const { user } = useAdmin();
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) return;
    let active = true;
    setChecking(true);
    adminCommand<{ready: boolean; missing: string[]}>('schema/status').then(status => {
      if (active) setMessage(status.ready ? '' : 'Hệ thống quản trị cần được cập nhật dữ liệu trước khi vận hành. Vui lòng liên hệ người quản trị kỹ thuật.');
    }).catch(error => { if (active) setMessage(error.message); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [user?.id, user?.role, attempt]);
  if (!message) return null;
  return <div role="alert" className="admin-error mb-4"><span>{message}</span><button type="button" disabled={checking} onClick={() => setAttempt(value => value + 1)}>{checking ? 'Đang kiểm tra…' : 'Kiểm tra lại'}</button></div>;
}
