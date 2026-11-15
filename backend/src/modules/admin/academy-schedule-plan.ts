import { BadRequestException, ConflictException } from '@nestjs/common';

export interface SchedulePlanInput {
  days: number[];
  startTime: string;
  endTime: string;
  roomId?: string;
  isPractice?: boolean;
  topicPrefix?: string;
  save?: boolean;
}

export function plannedDates(start: string, end: string, days: number[], from: string): string[] {
  if (!Array.isArray(days) || !days.length || days.some(d => !Number.isInteger(d) || d < 0 || d > 6))
    throw new BadRequestException('Chọn ngày học trong tuần.');
  const first = new Date(start + 'T00:00:00Z'), last = new Date(end + 'T00:00:00Z');
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || first > last ||
      (last.getTime() - first.getTime()) / 86400000 > 730)
    throw new BadRequestException('Khoảng ngày của lớp phải hợp lệ và tối đa 2 năm.');
  const dates: string[] = [];
  for (const day = new Date(first); day <= last; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    if (date >= from && days.includes(day.getUTCDay())) dates.push(date);
  }
  if (!dates.length) throw new ConflictException('Không có ngày học tương lai phù hợp trong thời gian của lớp.');
  if (dates.length > 300) throw new BadRequestException('Mỗi lần chỉ tạo tối đa 300 buổi.');
  return dates;
}
