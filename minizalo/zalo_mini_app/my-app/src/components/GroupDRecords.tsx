import React from 'react';
import { Box, Text } from 'zmp-ui';
import type { MedicalRecord } from '../../../../backend/src/data/database';
import type { TreatmentJournal } from '../../../../../database/shared_types';

export type CareRecord = Partial<MedicalRecord & TreatmentJournal> & {
  id: string;
  technicianName?: string | null;
  branchName?: string | null;
  serviceName?: string | null;
  serviceImage?: string | null;
  serviceId?: string | null;
  bookingStatus?: string | null;
  reviewId?: string | null;
};

export const careDate = (value?: string | null) => {
  if (!value) return 'Chưa có ngày';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? 'Ngày không khả dụng' : date.toLocaleDateString('vi-VN');
};

export const GroupDRecords: React.FC<{
  records?: CareRecord[] | null;
  loading?: boolean;
  error?: string;
}> = ({ records, loading = false, error }) => (
  <Box className="space-y-4 px-4 pt-1 pb-16 break-words">
    <Text className="text-sm font-bold">Nhật ký chăm sóc</Text>
    {loading && <p className="text-xs" role="status">Đang tải nhật ký...</p>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {!loading && !error && !records && <Text className="text-xs">Nhật ký chưa khả dụng.</Text>}
    {!loading && !error && records?.length === 0 && <Text className="text-xs">Chưa có nhật ký chăm sóc.</Text>}
    {records?.map(record => (
      <Box key={record.id} className="space-y-2 border-b border-[#EADECF] py-3">
        <Text className="text-xs font-bold">{careDate(record.sessionDate || record.diagnosisDate)}</Text>
        {record.sessionNumber != null && <Text className="text-xs">Buổi {record.sessionNumber}</Text>}
        {record.serviceName && <Text className="text-xs font-bold">{record.serviceName}</Text>}
        {(record.technicianName || record.doctorName) && <Text className="text-xs">{record.technicianName || record.doctorName}</Text>}
        {(record.branchName || record.facility) && <Text className="text-xs">{record.branchName || record.facility}</Text>}
        {record.conditionBefore && <Text className="text-xs whitespace-pre-wrap">Trước chăm sóc: {record.conditionBefore}</Text>}
        {record.conditionAfter && <Text className="text-xs whitespace-pre-wrap">Sau chăm sóc: {record.conditionAfter}</Text>}
        {record.treatmentNotes && <Text className="text-xs whitespace-pre-wrap">{record.treatmentNotes}</Text>}
        {(record.specialistAdvice || record.doctorAdvice) && <Text className="text-xs whitespace-pre-wrap">{record.specialistAdvice || record.doctorAdvice}</Text>}
        {(['beforePhotos', 'afterPhotos'] as const).map(field => {
          const photos = Array.isArray(record[field]) ? record[field]!.filter(src => typeof src === 'string' && src.trim()) : [];
          return photos.length > 0 && <div key={field} className="space-y-2">
            <p className="text-xs font-semibold">{field === 'beforePhotos' ? 'Trước chăm sóc' : 'Sau chăm sóc'}</p>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((src, index) => <img key={`${field}-${index}`} src={src} alt={field === 'beforePhotos' ? 'Trước chăm sóc' : 'Sau chăm sóc'} loading="lazy" className="w-full rounded-[8px]" />)}
            </div>
          </div>;
        })}
      </Box>
    ))}
  </Box>
);
