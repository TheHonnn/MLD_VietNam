import { describe, it, expect } from 'vitest';
import { plannedDates } from './academy-schedule-plan';

describe('planned class sessions', () => {
  it('generates only selected weekdays within the class interval and from today', () => {
    expect(plannedDates('2026-11-16','2026-11-27',[1,5],'2026-11-18')).toEqual(['2026-11-20','2026-11-23','2026-11-27']);
  });
  it('rejects an empty weekday set and excessive date ranges', () => {
    expect(()=>plannedDates('2026-11-16','2026-11-27',[],'2026-11-16')).toThrow();
    expect(()=>plannedDates('2026-11-16','2030-11-27',[1],'2026-11-16')).toThrow();
  });
});
