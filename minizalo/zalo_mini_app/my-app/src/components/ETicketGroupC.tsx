import React from 'react';
import type { Booking, Branch } from '../../../../backend/src/data/database';
import { CheckIcon, ArrowLeftIcon } from './Icons';
import { QRCode } from './QRCode';
import { BookingRows, BookingStatus, bookingPayment } from './BookingInformation';
import '@/css/appointments.scss';

interface ETicketGroupCProps {
  booking: Booking | null;
  branches?: Branch[];
  onClose: () => void;
  onGoToAppointments: () => void;
}

export const ETicketGroupC: React.FC<ETicketGroupCProps> = ({ booking, branches, onClose, onGoToAppointments }) => {
  if (!booking) return null;
  return <section className="appointment-screen booking-success" aria-labelledby="booking-success-heading">
    <header className="appointment-header"><div className="appointment-topbar"><button type="button" title="Quay lại" className="appointment-back" onClick={onClose}><ArrowLeftIcon size={20} /></button><span>ĐẶT LỊCH</span></div><h1 id="booking-success-heading">Đặt lịch thành công!</h1><p>Cảm ơn bạn đã đặt dịch vụ. Hẹn gặp bạn trong buổi chăm sóc sắp tới.</p>
      <ol className="booking-progress" aria-label="Tiến trình đặt lịch">{['Dịch vụ', 'Lịch hẹn', 'Xác nhận', 'Hoàn tất'].map((label, index) => <li key={label} className="is-active" aria-current={index === 3 ? 'step' : undefined}><span />{label}</li>)}</ol>
    </header>
    <main className="appointment-body" tabIndex={0} aria-label="Lịch hẹn vừa đặt"><div className="appointment-success-icon"><CheckIcon size={30} /></div><p className="appointment-notice">{booking.groupSize&&booking.groupSize>1?`Đã ghi nhận nhóm ${booking.groupSize} người. Mỗi người có một lịch hẹn riêng.`:'Lịch hẹn đã được ghi nhận.'} {bookingPayment(booking)}</p>
      <article className="appointment-card"><BookingStatus booking={booking} /><p className="appointment-code">MÃ LỊCH HẸN · {booking.code}</p><h2>{booking.serviceTitle}</h2><BookingRows booking={booking} branches={branches} /></article>
      {(booking.qrCodeHash || booking.qrCode) && <section className="appointment-qr"><h2>Mã lịch hẹn</h2><QRCode value={booking.qrCodeHash || booking.qrCode} size={160} /></section>}
    </main>
    <footer className="appointment-footer"><button type="button" onClick={onGoToAppointments}>Xem lịch hẹn</button></footer>
  </section>;
};
