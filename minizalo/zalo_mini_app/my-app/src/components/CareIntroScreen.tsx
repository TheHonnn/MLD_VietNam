import React, { useId } from 'react';
import onboardingReference from '../../../../figma/01 — GROUP A/ONBOARDING & AUTH.png';
import '@/css/care-intro.scss';

export function CareIntroScreen({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const photoClipId = useId();
  return <section className="care-intro-screen" aria-labelledby="care-intro-heading">
    <div className="care-intro-page">
      <header className="care-intro-header">
        <span>CHĂM SÓC &amp; PHÁT TRIỂN</span>
        <button type="button" onClick={onSkip}>Bỏ qua</button>
      </header>
      <div className="care-intro-photo" role="img" aria-label="Chuyên viên chăm sóc và massage vai cho khách tại spa">
        <svg viewBox="490 188 350 360" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
          <defs><clipPath id={photoClipId}><rect x="490" y="188" width="350" height="360" /></clipPath></defs>
          <image href={onboardingReference} width="2644" height="972" clipPath={`url(#${photoClipId})`} />
        </svg>
      </div>
      <div className="care-intro-progress" aria-label="Giới thiệu 1 trên 3">
        <span className="is-active" /><span /><span />
      </div>
      <h1 id="care-intro-heading">Chăm sóc sức khỏe<br />mỗi ngày</h1>
      <p className="care-intro-description">Trải nghiệm các dịch vụ spa, thư giãn và chăm sóc sức khỏe chuyên nghiệp.</p>
      <footer className="care-intro-footer">
        <button type="button" onClick={onContinue}>Tiếp tục</button>
      </footer>
    </div>
  </section>;
}
