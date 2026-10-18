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
  if (!value) return null;
  if (failed) return <p role="alert" className="text-xs">Không thể tạo mã QR.</p>;
  return <span className={className} style={{ display: 'inline-flex', width: size, height: size, maxWidth: '100%', alignItems: 'center', justifyContent: 'center' }}>
    {image ? <img src={image} width={size} height={size} alt="Mã QR" /> : <span role="status" className="text-xs">Đang tạo mã QR...</span>}
  </span>;
}
