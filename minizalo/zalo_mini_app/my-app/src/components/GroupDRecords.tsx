import React from 'react';
import { Box, Text } from 'zmp-ui';
import { MedicalRecord } from '../../../../backend/src/data/database';

export const GroupDRecords: React.FC<{ records: MedicalRecord[] }> = ({ records }) => (
  <Box className="space-y-4 px-4 pt-1 pb-16">
    <Text className="text-sm font-bold">Nhật ký chăm sóc</Text>
    {!records.length && <Text className="text-xs">Chưa có nhật ký chăm sóc.</Text>}
    {records.map(record => (
      <Box key={record.id} className="space-y-2 border-b border-[#EADECF] py-3">
        <Text className="text-xs font-bold">{record.diagnosisDate}</Text>
        {record.doctorName && <Text className="text-xs">{record.doctorName}</Text>}
        {record.facility && <Text className="text-xs">{record.facility}</Text>}
        {record.conditionBefore && <Text className="text-xs">Trước chăm sóc: {record.conditionBefore}</Text>}
        {record.conditionAfter && <Text className="text-xs">Sau chăm sóc: {record.conditionAfter}</Text>}
        {record.treatmentNotes && <Text className="text-xs">{record.treatmentNotes}</Text>}
        {record.doctorAdvice && <Text className="text-xs">{record.doctorAdvice}</Text>}
        <div className="grid grid-cols-2 gap-2">
          {(record.beforePhotos || []).map((src, index) => <img key={'before-' + index} src={src} alt="Trước chăm sóc" className="w-full rounded-[8px]" />)}
          {(record.afterPhotos || []).map((src, index) => <img key={'after-' + index} src={src} alt="Sau chăm sóc" className="w-full rounded-[8px]" />)}
        </div>
      </Box>
    ))}
  </Box>
);
