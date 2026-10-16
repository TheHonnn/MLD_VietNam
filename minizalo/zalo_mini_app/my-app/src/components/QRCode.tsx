import React, { useEffect, useState } from 'react';
import QR from 'qrcode';

export function QRCode({ value, size = 180, className = '' }: { value: string; size?: number; className?: string }) {
  const [image, setImage] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setImage(''); setFailed(false);
    if (!value) return;
    QR.toDataURL(value, { width: size, margin: 2, errorCorrectionLevel: 'M' })
      .then((result: string) => { if (!cancelled) setImage(result); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [value, size]);
  if (!value || failed) return <p role="status" className="text-xs">Chưa có mã QR hợp lệ.</p>;
  return <span className={className} style={{ display: 'inline-flex', width: size, height: size, maxWidth: '100%', alignItems: 'center', justifyContent: 'center' }}>
    {image ? <img src={image} width={size} height={size} alt="Mã QR" /> : <span role="status" className="text-xs">Đang tạo mã QR...</span>}
  </span>;
}
