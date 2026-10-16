import React from 'react';
import { PurposeInterest } from '../../../../../database/shared_types';
import { ArrowLeftIcon, CheckIcon, HeartIcon, NavAcademyIcon, FileTextIcon } from './Icons';
import '@/css/interest-onboarding.scss';

const choices = [
  { value: PurposeInterest.BEAUTY_SPA, title: 'Chăm sóc sức khỏe', description: 'Đặt lịch spa, chăm sóc cơ thể, theo dõi liệu trình và nhận ưu đãi.', Icon: HeartIcon },
  { value: PurposeInterest.ACADEMY, title: 'Học nghề spa', description: 'Khám phá khóa học, đăng ký đào tạo và theo dõi quá trình học tập.', Icon: NavAcademyIcon },
  { value: PurposeInterest.BOTH, title: 'Cả hai', description: 'Trải nghiệm đầy đủ dịch vụ chăm sóc sức khỏe và chương trình đào tạo nghề.', Icon: FileTextIcon },
];

export function InterestSelectionScreen({ value, onChange, onBack, onExplore, onVerifyAgain, busy, expired, error }: {
  value: PurposeInterest | null;
  onChange: (value: PurposeInterest) => void;
  onBack: () => void;
  onExplore: () => void;
  onVerifyAgain: () => void;
  busy: boolean;
  expired: boolean;
  error: string;
}) {
  return <section className="new-customer-page interest-page" aria-labelledby="interest-heading">
    <div className="interest-page-content">
      <header className="interest-header">
        <button type="button" className="onboarding-back" onClick={onBack} disabled={busy} aria-label="Quay lại hồ sơ" title="Quay lại hồ sơ"><ArrowLeftIcon size={20} /></button>
      </header>
      <h1 id="interest-heading" tabIndex={-1}>Bạn quan tâm đến điều<br />gì?</h1>
      <p className="interest-description">Chọn nhu cầu để chúng tôi mang đến trải nghiệm phù hợp nhất.</p>
      <fieldset className="interest-choices" disabled={busy || expired}>
        <legend className="sr-only">Nhu cầu của bạn</legend>
        {choices.map(({ value: option, title, description, Icon }) => <label key={option} className={`interest-choice ${value === option ? 'is-selected' : ''}`}>
          <span className="interest-choice-icon" aria-hidden="true"><Icon size={23} /></span>
          <span className="interest-choice-copy"><strong>{title}</strong><span id={`purpose-description-${option}`}>{description}</span></span>
          <input type="radio" name="purpose" value={option} checked={value === option} onChange={() => onChange(option)} aria-label={title} aria-describedby={`purpose-description-${option}`} />
          <span className="interest-choice-check" aria-hidden="true"><CheckIcon size={12} color="white" /></span>
        </label>)}
      </fieldset>
      <footer className="interest-actions">
        {error ? <p role="alert" className="interest-error">{error}</p> : <p className="interest-hint">Bạn có thể thay đổi lựa chọn này trong hồ sơ.</p>}
        {expired
          ? <button type="button" className="onboarding-primary" onClick={onVerifyAgain}>Xác minh lại số điện thoại</button>
          : <button type="button" className="onboarding-primary" onClick={onExplore} disabled={busy || value === null} aria-busy={busy}>{busy ? 'Đang lưu hồ sơ...' : 'Khám phá ứng dụng'}</button>}
      </footer>
    </div>
  </section>;
}
