import React, { useId } from 'react';
import onboardingReference from '../../../../figma/01 — GROUP A/ONBOARDING & AUTH.png';
import '@/css/care-intro.scss';
import academyImage from '@/static/onboarding-academy.jpg';
import { useCarousel } from '@/hooks/useCarousel';

const topics = [
  { id: 'care', title: 'Chăm sóc sức khỏe mỗi ngày', description: 'Trải nghiệm các dịch vụ spa, thư giãn và chăm sóc sức khỏe chuyên nghiệp.' },
  { id: 'growth', title: 'Phát triển nghề nghiệp cùng bạn', description: 'Bồi dưỡng kiến thức, nâng cao tay nghề và mở ra cơ hội mới với các khóa học chuyên môn.' },
  { id: 'connect', title: 'Đồng hành cùng bạn', description: 'Theo dõi lịch hẹn, quá trình chăm sóc và hành trình học tập của bạn.' },
];

export function CareIntroScreen({ onContinue, onSkip, initialIndex = 0 }: { onContinue: () => void; onSkip: () => void; initialIndex?: number }) {
  const photoClipId = useId();
  const { index, select } = useCarousel(topics.map(topic => topic.id), false, initialIndex);
  const topic = topics[index];
  return <section className="care-intro-screen" aria-labelledby="care-intro-heading">
    <div className="care-intro-page">
      <header className="care-intro-header">
        <span>CHĂM SÓC &amp; PHÁT TRIỂN</span>
        <button type="button" onClick={onSkip}>Bỏ qua</button>
      </header>
      <div key={topic.id} className="care-intro-photo carousel-enter" role="img" aria-label={index === 1 ? 'Không gian học tập và phát triển chuyên môn' : 'Chuyên viên chăm sóc và massage vai cho khách tại spa'}>
        {index === 1 ? <img src={academyImage} alt="" /> :
        <svg viewBox="490 188 350 360" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
          <defs><clipPath id={photoClipId}><rect x="490" y="188" width="350" height="360" /></clipPath></defs>
          <image href={onboardingReference} width="2644" height="972" clipPath={`url(#${photoClipId})`} />
        </svg>}
      </div>
      <div className="care-intro-progress" aria-label={`Giới thiệu ${index + 1} trên 3`}>
        {topics.map((item, i) => <button key={item.id} type="button" aria-label={item.title} aria-pressed={i === index} onClick={() => select(item.id)}><span className={i === index ? 'is-active' : ''} /></button>)}
      </div>
      <h1 key={`${topic.id}:title`} className="carousel-enter" id="care-intro-heading">{topic.title}</h1>
      <p key={`${topic.id}:description`} className="care-intro-description carousel-enter">{topic.description}</p>
      <footer className="care-intro-footer">
        <button type="button" onClick={onContinue}>Tiếp tục</button>
      </footer>
    </div>
  </section>;
}
