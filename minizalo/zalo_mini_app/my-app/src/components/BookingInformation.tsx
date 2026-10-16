import React from 'react';
import type { Booking, Branch } from '../../../../backend/src/data/database';

const statuses: Record<string, string> = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', checked_in: 'Đã đến', in_service: 'Đang thực hiện', completed: 'Đã hoàn thành', cancelled: 'Đã hủy', no_show: 'Không đến' };
const payments: Record<string, string> = { unpaid: 'Chưa thanh toán', pending: 'Chờ thanh toán', partial: 'Đã thanh toán một phần', paid: 'Đã thanh toán', refunded: 'Đã hoàn tiền', failed: 'Thanh toán thất bại' };
export const bookingDate = (date: string) => /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10).split('-').reverse().join('/') : date;
export const bookingPayment = (booking: Booking) => payments[booking.paymentStatus || ''] || 'Chưa có trạng thái thanh toán';
export const bookingDuration = (booking: Booking) => booking.items?.length && booking.items.every(item => Number(item.durationMinutes) > 0)
  ? booking.items.reduce((sum, item) => sum + Number(item.durationMinutes), 0) : null;
export function BookingStatus({ booking }: { booking: Booking }) {
  return <span className={`appointment-status appointment-status--${booking.status}`}>{statuses[booking.status] || booking.status}</span>;
}
export function BookingRows({ booking, branches = [] }: { booking: Booking; branches?: Branch[] }) {
  const branch = branches.find(item => item.id === booking.branchId);
  const rows = [['Ngày hẹn', bookingDate(booking.date)], ['Giờ chăm sóc', booking.timeSlot], ['Chi nhánh', booking.branchName || branch?.name], ['Địa chỉ', branch?.address], ['Chuyên viên', booking.doctorName], ['Khách hàng', booking.userName], ['Số điện thoại', booking.userPhone], ['Tổng tiền', `${booking.finalPrice.toLocaleString('vi-VN')}đ`], ['Thanh toán', bookingPayment(booking)]];
  return <dl className="appointment-rows">{rows.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
