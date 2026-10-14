import React, { useState } from 'react';
import { Box, Text, Modal } from 'zmp-ui';
import { MedicalRecord } from '../../../../backend/src/data/database';
import {
  ChatBubbleIcon,
  ClockIcon,
  FileTextIcon,
  CloseIcon,
  ShieldIcon,
  HeartIcon,
  ArrowLeftIcon,
} from './Icons';

interface GroupDRecordsProps {
  records: MedicalRecord[];
}

export const GroupDRecords: React.FC<GroupDRecordsProps> = ({ records }) => {
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(records[0] || null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'doctor',
      text: 'Chào bác An, chỉ số Cholesterol lần này của bác có xu hướng tăng nhẹ lên 5.8 mmol/L. Bác nhớ duy trì thuốc Atorvastatin 10mg vào mỗi buổi tối trước khi đi ngủ nhé!',
      time: '10:45',
    },
    {
      sender: 'user',
      text: 'Dạ cảm ơn Bác sĩ Hùng, tôi uống đều mỗi tối rồi. Dạo này tôi có cần kiêng thêm đồ ăn gì không bác sĩ?',
      time: '10:48',
    },
    {
      sender: 'doctor',
      text: 'Bác nên giảm bớt các món xào nhiều dầu mỡ và phủ tạng động vật, tăng cường rau xanh và đi bộ 30 phút buổi sáng là rất tốt.',
      time: '10:50',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text: inputMessage,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInputMessage('');
  };

  if (!selectedRecord) return null;

  return (
    <Box className="space-y-4 px-4 pt-1 pb-16">
      {/* Top Banner (Figma Group D) */}
      <Box className="rounded-3xl p-4 text-white shadow-md bg-gradient-to-r from-[#98501B] via-[#B8682C] to-[#804215] relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <Box className="relative z-10 space-y-1">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider border border-white/30">
            Bệnh Án Điện Tử (EMR)
          </span>
          <Text className="text-base font-extrabold text-white leading-tight">
            Theo Dõi Sức Khỏe & Toa Thuốc Số
          </Text>
          <Text className="text-xs text-amber-100 font-light flex items-center space-x-1">
            <ShieldIcon size={12} className="inline mr-1" />
            Mã hóa y tế chuẩn HIPAA • Đồng bộ tức thì với Bác sĩ phụ trách
          </Text>
        </Box>
      </Box>

      {/* Telehealth Live Consultation Card (Figma Group D) */}
      <Box className="bg-white rounded-2xl p-3.5 border border-[#EADECF] shadow-sm flex items-center justify-between">
        <Box className="flex items-center space-x-3">
          <Box className="relative">
            <img
              src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80"
              alt="Doctor"
              className="w-12 h-12 rounded-full object-cover border border-[#EADECF]"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          </Box>
          <Box>
            <Text className="text-xs font-bold text-[#40352F]">
              {selectedRecord.doctorName}
            </Text>
            <Text className="text-[10px] text-[#98501B] font-semibold">
              Bác sĩ điều trị trực tiếp
            </Text>
            <Text className="text-[10px] text-stone-400">
              Trực tuyến • Sẵn sàng tư vấn
            </Text>
          </Box>
        </Box>
        <button
          onClick={() => setIsChatOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-[#98501B] hover:bg-[#804215] text-white text-xs font-bold shadow-sm shadow-[#98501B]/20 active:scale-95 transition flex items-center space-x-1.5"
        >
          <span>Chat Ngay</span>
          <ChatBubbleIcon size={13} />
        </button>
      </Box>

      {/* Vital Signs Grid (Figma Group D) */}
      <Box className="space-y-2">
        <Text className="text-sm font-bold text-slate-900 tracking-tight">
          Chỉ Số Sinh Tồn Gần Nhất
        </Text>
        <Box className="grid grid-cols-2 gap-2.5">
          <Box className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-0.5">
            <Text className="text-[10px] text-slate-400 font-medium">Huyết Áp</Text>
            <Text className="text-base font-black text-rose-600">
              {selectedRecord.vitalSigns.bloodPressure}
            </Text>
            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              Cận tăng nhẹ
            </span>
          </Box>

          <Box className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-0.5">
            <Text className="text-[10px] text-slate-400 font-medium">Nhịp Tim</Text>
            <Text className="text-base font-black text-blue-600">
              {selectedRecord.vitalSigns.heartRate} <span className="text-xs font-normal">bpm</span>
            </Text>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Ổn định
            </span>
          </Box>

          <Box className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-0.5">
            <Text className="text-[10px] text-slate-400 font-medium">Độ bão hòa Oxy (SpO2)</Text>
            <Text className="text-base font-black text-emerald-600">
              {selectedRecord.vitalSigns.spO2}%
            </Text>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Rất tốt
            </span>
          </Box>

          <Box className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-0.5">
            <Text className="text-[10px] text-slate-400 font-medium">Thân Nhiệt / Cân Nặng</Text>
            <Text className="text-base font-black text-slate-800">
              {selectedRecord.vitalSigns.temperature}°C • {selectedRecord.vitalSigns.weight}kg
            </Text>
            <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              Bình thường
            </span>
          </Box>
        </Box>
      </Box>

      {/* Lab Indicators (Figma Group D 32 Indicators) */}
      <Box className="space-y-2">
        <Box className="flex items-center justify-between">
          <Text className="text-sm font-bold text-slate-900 tracking-tight">
            Chỉ Số Xét Nghiệm Sinh Hóa
          </Text>
          <span className="text-xs text-slate-400 font-medium">Ngày {selectedRecord.diagnosisDate}</span>
        </Box>
        <Box className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm space-y-2">
          {selectedRecord.labIndicators.map((item, idx) => (
            <Box
              key={idx}
              className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-none text-xs"
            >
              <Box>
                <Text className="font-bold text-slate-800">{item.name}</Text>
                <Text className="text-[10px] text-slate-400">Tham chiếu: {item.referenceRange} {item.unit}</Text>
              </Box>
              <Box className="text-right">
                <Text className="font-extrabold text-slate-900">{item.value} {item.unit}</Text>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    item.status === 'Cao'
                      ? 'bg-rose-100 text-rose-700'
                      : item.status === 'Thấp'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {item.status}
                </span>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Electronic Prescription (Toa Thuốc Điện Tử) */}
      <Box className="space-y-2">
        <Text className="text-sm font-bold text-[#40352F] tracking-tight">
          Toa Thuốc Đang Dùng & Nhắc Lịch Uống
        </Text>
        <Box className="space-y-2">
          {selectedRecord.prescription.map((rx, idx) => (
            <Box
              key={idx}
              className="p-3 rounded-2xl bg-white border border-[#EADECF] shadow-sm space-y-1"
            >
              <Box className="flex items-center justify-between">
                <Text className="text-xs font-extrabold text-[#98501B]">{rx.medicineName}</Text>
                <span className="text-[10px] font-bold text-[#98501B] bg-[#FAF6F0] border border-[#EADECF] px-2 py-0.5 rounded">
                  {rx.dosage}
                </span>
              </Box>
              <Text className="text-xs text-[#40352F] font-medium flex items-center">
                <ClockIcon size={12} className="text-[#98501B] mr-1.5 shrink-0" />
                <span>{rx.schedule}</span>
              </Text>
              <Text className="text-[11px] text-stone-500 flex items-center">
                <FileTextIcon size={12} className="text-[#98501B] mr-1.5 shrink-0" />
                <span>{rx.notes}</span>
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Telehealth Chat Full Page (Figma Group D Telehealth Live Chat) */}
      {isChatOpen && selectedRecord && (
        <div className="absolute inset-0 z-50 bg-[#FAF6F0] flex flex-col overflow-hidden animate-fade-in text-stone-800">
          {/* Chat Header */}
          <div className="bg-white border-b border-[#EADECF] px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setIsChatOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FAF6F0] flex items-center justify-center text-[#40352F] hover:bg-[#EADECF] transition active:scale-95"
              >
                <ArrowLeftIcon size={16} color="#40352F" />
              </button>
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80"
                alt="Doctor"
                className="w-9 h-9 rounded-full object-cover border border-[#EADECF]"
              />
              <div>
                <h3 className="text-xs font-bold text-[#40352F]">
                  {selectedRecord.doctorName}
                </h3>
                <p className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span>Đang online • Bảo mật HIPAA</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-xs text-[#98501B] font-bold"
            >
              Đóng
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto space-y-3 p-4 pb-20">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#98501B] text-white rounded-br-none'
                      : 'bg-white text-[#40352F] border border-[#EADECF] rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-stone-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-3 bg-white border-t border-[#EADECF] flex items-center space-x-2 shrink-0 shadow-lg">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Nhập câu hỏi trao đổi với bác sĩ..."
              className="flex-1 text-xs p-3 rounded-xl border border-[#EADECF] bg-[#FAF6F0] outline-none focus:border-[#98501B]"
            />
            <button
              onClick={handleSendMessage}
              className="px-4 py-3 rounded-xl bg-[#98501B] hover:bg-[#804215] text-white text-xs font-bold active:scale-95 transition shadow-sm"
            >
              Gửi
            </button>
          </div>
        </div>
      )}
    </Box>
  );
};
