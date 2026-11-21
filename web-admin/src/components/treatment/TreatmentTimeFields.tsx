import { useId } from 'react';

interface TreatmentTimeFieldsProps {
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

export function TreatmentTimeFields({ start, end, onStartChange, onEndChange }: TreatmentTimeFieldsProps) {
  const id = useId();
  const minutes = (value: string) => {
    const [hours, minute] = value.split(':').map(Number);
    return hours * 60 + minute;
  };
  const invalid = Boolean(start && end && minutes(end) <= minutes(start));
  const chooseDuration = (duration: number) => {
    if (!start) return;
    const result = minutes(start) + duration;
    if (result >= 24 * 60) return;
    onEndChange(String(Math.floor(result / 60)).padStart(2, '0') + ':' + String(result % 60).padStart(2, '0'));
  };

  const picker = (label: string, value: string, update: (time: string) => void, field: string) => {
    const [hour = '', minute = ''] = value.split(':');
    return <fieldset className="min-w-0 space-y-1.5">
      <legend className="text-xs font-semibold text-[#2C241E]">{label}</legend>
      <div className="flex items-center gap-2">
        <label htmlFor={id + field + '-hour'} className="sr-only">{label} – giờ</label>
        <select id={id + field + '-hour'} value={hour} onChange={event => update(event.target.value + ':' + (minute || '00'))}
          className="min-w-0 flex-1 rounded-xl border border-[#E8DFD8] bg-white px-3 py-2.5 text-sm">
          <option value="" disabled>Giờ</option>
          {Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')).map(item => <option key={item} value={item}>{item} giờ</option>)}
        </select>
        <span aria-hidden="true">:</span>
        <label htmlFor={id + field + '-minute'} className="sr-only">{label} – phút</label>
        <select id={id + field + '-minute'} value={minute}
          ref={element => element?.setCustomValidity(field === 'end' && invalid ? 'Giờ kết thúc phải sau giờ bắt đầu.' : '')}
          onChange={event => update((hour || '00') + ':' + event.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-[#E8DFD8] bg-white px-3 py-2.5 text-sm">
          <option value="" disabled>Phút</option>
          {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0')).map(item => <option key={item} value={item}>{item} phút</option>)}
        </select>
      </div>
    </fieldset>;
  };

  return <div className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2">
      {picker('Giờ bắt đầu', start, onStartChange, 'start')}
      {picker('Giờ kết thúc', end, onEndChange, 'end')}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[#73675F]">Chọn thời lượng</span>
      {[30, 45, 60, 90, 120].map(duration => <button key={duration} type="button"
        disabled={!start || minutes(start) + duration >= 24 * 60}
        onClick={() => chooseDuration(duration)}
        className="rounded-lg border border-[#E8DFD8] bg-white px-3 py-2 text-xs font-semibold text-[#864512] disabled:opacity-40">{duration} phút</button>)}
    </div>
    {invalid ? <p role="alert" className="text-xs text-red-700">Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.</p>
      : start && end ? <p role="status" className="text-xs text-[#73675F]">Thời lượng đã chọn {minutes(end) - minutes(start)} phút.</p>
      : <p className="text-xs text-[#73675F]">Chọn giờ bắt đầu, sau đó chọn thời lượng để điền giờ kết thúc.</p>}
  </div>;
}
