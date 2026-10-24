import React from 'react';
import type { Booking, Branch } from '../../../../backend/src/data/database';

const statuses: Record<string, string> = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', checked_in: 'Đã đến', in_service: 'Đang thực hiện', completed: 'Đã hoàn thành', cancelled: 'Đã hủy', no_show: 'Không đến' };
export const bookingDate = (date: string) => /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10).split('-').reverse().join('/') : date;
export const bookingPayment = (booking: Booking) => booking.userPackageId ? `${booking.packageName || 'Gói liệu trình'} · ${booking.packageReservationState==='CONSUMED'?'Đã ghi nhận buổi':booking.packageReservationState==='RELEASED'?'Đã trả lại buổi':'Đang giữ buổi'}` : '';
export const bookingDuration = (booking: Booking) => booking.items?.length && booking.items.every(item => Number(item.durationMinutes) > 0)
  ? booking.items.reduce((sum, item) => sum + Number(item.durationMinutes), 0) : null;
export function BookingStatus({ booking }: { booking: Booking }) {
  return <span className={`appointment-status appointment-status--${booking.status}`}>{statuses[booking.status] || booking.status}</span>;
}
export function BookingRows({ booking, branches = [] }: { booking: Booking; branches?: Branch[] }) {
  const branch = branches.find(item => item.id === booking.branchId);
  const rows = [['Ngày hẹn', bookingDate(booking.date)], ['Giờ chăm sóc', booking.timeSlot], ['Chi nhánh', booking.branchName || branch?.name], ['Địa chỉ', branch?.address], ['Kỹ thuật viên được phân công', booking.doctorName], ['Phòng',booking.roomName], ['Giường',booking.bedNumber?String(booking.bedNumber):''], ['Nhóm đặt lịch',booking.groupSize&&booking.groupSize>1?`${booking.groupSize} người · lượt ${booking.memberNumber}`:''], ['Khách hàng / người liên hệ', booking.userName], ['Số điện thoại', booking.userPhone], ['Giá dịch vụ', `${booking.price.toLocaleString('vi-VN')}đ`], ...(booking.discount > 0 ? [['Ưu đãi', `${booking.discount.toLocaleString('vi-VN')}đ`]] : []), ['Thành tiền lượt này', `${booking.finalPrice.toLocaleString('vi-VN')}đ`], ['Liệu trình', bookingPayment(booking)]];
  return <>{booking.customerName&&booking.customerName!==booking.userName&&<dl className="appointment-rows"><div><dt>Người liên hệ đặt lịch</dt><dd>{booking.customerName}{booking.customerPhone&&<> · {booking.customerPhone}</>}</dd></div></dl>}{booking.items && booking.items.length > 1 && <section className="space-y-2 py-3 text-xs" aria-label="Dịch vụ trong lịch hẹn"><h3 className="font-semibold">Dịch vụ trong lịch hẹn</h3>{booking.items.map((item,index) => <div key={`${item.serviceId}-${index}`} className="border-b py-2"><strong>{item.serviceTitle}</strong><p>{item.durationMinutes != null ? `${item.durationMinutes} phút · ` : ''}{Number(item.price).toLocaleString('vi-VN')}đ</p></div>)}</section>}<dl className="appointment-rows">{rows.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></>;
}
