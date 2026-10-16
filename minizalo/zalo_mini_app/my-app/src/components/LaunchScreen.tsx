import React, { useEffect, useState } from 'react';
import logo from '../../../../figma/logo.png';
import onboardingReference from '../../../../figma/01 — GROUP A/ONBOARDING & AUTH.png';
import '@/css/launch.scss';

export function LaunchScreen({ ready, onComplete }: { ready: boolean; onComplete: () => void }) {
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [maximumElapsed, setMaximumElapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumElapsed(true), 1200);
    const deadline = window.setTimeout(() => setMaximumElapsed(true), 4000);
    return () => { window.clearTimeout(timer); window.clearTimeout(deadline); };
  }, []);

  useEffect(() => {
    if (minimumElapsed && (ready || maximumElapsed)) onComplete();
  }, [ready, minimumElapsed, maximumElapsed, onComplete]);

  return <section className="launch-screen" aria-label="MLD Việt Nam đang khởi động" aria-busy="true">
    <div className="launch-leaves launch-leaves--top" style={{ backgroundImage: `url("${onboardingReference}")` }} aria-hidden="true" />
    <div className="launch-leaves launch-leaves--bottom" style={{ backgroundImage: `url("${onboardingReference}")` }} aria-hidden="true" />
    <div className="launch-brand">
      <div className="launch-logo"><img src={logo} alt="MLD Vietnam" width="490" height="228" /></div>
      <h1>CHĂM SÓC SỨC KHỎE<br />&amp; ĐÀO TẠO NGHỀ</h1>
      <span className="launch-divider" aria-hidden="true" />
      <p>Tận tâm chăm sóc – Đồng hành phát triển</p>
    </div>
    <div className="launch-status" role="status">
      <span className="launch-spinner" aria-hidden="true" />
      <p>Đang chuẩn bị trải nghiệm...</p>
    </div>
  </section>;
}
