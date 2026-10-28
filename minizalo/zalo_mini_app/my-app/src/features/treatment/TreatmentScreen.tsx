import React, { useState, useEffect } from 'react';
import { supabaseApi } from '@/api/supabase';
import { Calendar, Activity, CheckCircle, Clock, ChevronRight, FileText, UserCheck, AlertCircle, Sparkles, PhoneCall } from 'lucide-react';

interface LymphDiaryItem {
  id: string;
  sessionNumber: number;
  date: string;
  therapy: string;
  targetArea: string;
  edemaBefore: string;
  edemaAfter: string;
  reductionRate: string;
  specialistName: string;
  notes: string;
}

interface BeforeAfterCase {
  id: string;
  title: string;
  indication: string;
  duration: string;
  beforeImage: string;
  afterImage: string;
  summary: string;
}

const DEFAULT_DIARY_ENTRIES: LymphDiaryItem[] = [
  {
    id: 'entry-1',
    sessionNumber: 3,
    date: '26/10/2026',
    therapy: 'Dẫn lưu bạch huyết Vodder chuyên sâu',
    targetArea: 'Mặt & Cổ sau phẫu thuật gọt hàm',
    edemaBefore: 'Vòng cằm 41.5 cm - Phù cứng độ 2',
    edemaAfter: 'Vòng cằm 38.2 cm - Giảm căng tức',
    reductionRate: '-8%',
    specialistName: 'Trần Minh Phương',
    notes: 'Mô mềm dần, lưu thông tĩnh mạch cổ cải thiện tốt. Khuyến nghị chườm ấm nhẹ và uống 2 lít nước.',
  },
  {
    id: 'entry-2',
    sessionNumber: 2,
    date: '23/10/2026',
    therapy: 'Dẫn lưu bạch huyết chi trên',
    targetArea: 'Cánh tay phải (Hậu phẫu hạch nách)',
    edemaBefore: 'Chu vi bắp tay 32 cm',
    edemaAfter: 'Chu vi bắp tay 30.5 cm',
    reductionRate: '-5%',
    specialistName: 'Lê Hoàng Yến',
    notes: 'Giảm ứ trệ dịch bạch huyết đáng kể, cử động khớp vai linh hoạt hơn.',
  },
  {
    id: 'entry-3',
    sessionNumber: 1,
    date: '20/10/2026',
    therapy: 'Thăm khám & Khai thông hạch bạch huyết cơ bản',
    targetArea: 'Toàn thân',
    edemaBefore: 'Căng tức phù mô độ 1',
    edemaAfter: 'Thư giãn hoàn toàn',
    reductionRate: '-3%',
    specialistName: 'ThS.BS Trần Kim Dung',
    notes: 'Thiết lập phác đồ 6 buổi Vodder kết hợp băng ép y khoa.',
  },
];

const BEFORE_AFTER_CASES: BeforeAfterCase[] = [
  {
    id: 'case-1',
    title: 'Phục hồi phù nề cổ mặt sau phẫu thuật hàm',
    indication: 'Phù nề bầm tím cấp tính sau can thiệp xương hàm',
    duration: '5 buổi MLD Vodder chuẩn y khoa',
    beforeImage: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
    afterImage: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
    summary: 'Giảm 85% phù nề, tan máu bầm, trả lại đường viền hàm tự nhiên mà không gây đau đớn.',
  },
  {
    id: 'case-2',
    title: 'Dẫn lưu bạch huyết chi dưới (Lymphedema độ 2)',
    indication: 'Phù bạch huyết tiên phát chân trái gây nặng nề khó đi lại',
    duration: '10 buổi trị liệu kết hợp tất áp lực',
    beforeImage: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=600&q=80',
    afterImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
    summary: 'Chu vi bắp chân giảm 4.5 cm, mô da bớt xơ hóa, bệnh nhân đi lại nhẹ nhàng.',
  },
];

interface TreatmentScreenProps {
  onBookAppointment: () => void;
}

export const TreatmentScreen: React.FC<TreatmentScreenProps> = ({ onBookAppointment }) => {
  const [activeTab, setActiveTab] = useState<'packages' | 'diary' | 'before_after' | 'assessment'>('diary');
  
  // Assessment Form State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [affectedArea, setAffectedArea] = useState('Vùng mặt / Cổ');
  const [edemaDuration, setEdemaDuration] = useState('Dưới 1 tháng');
  const [hasSurgery, setHasSurgery] = useState(true);
  const [edemaSeverity, setEdemaSeverity] = useState('Độ 2 - Phù ấn lõm rõ rệt');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const profile = supabaseApi.getUserProfile();
    setCustomerName(profile.fullName);
    setPhone(profile.phone);
  }, []);

  const handleAssessmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
    }, 1200);
  };

  return (
    <div className="min-h-full bg-slate-50 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 rounded-b-2xl shadow-md">
        <div className="flex items-center space-x-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
          <Activity className="w-4 h-4 text-emerald-300" />
          <span>Hồ sơ lâm sàng & Trị liệu Vodder</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Nhật ký Dẫn lưu Bạch huyết</h1>
        <p className="text-xs text-blue-100 mt-1">
          Theo dõi tiến độ giảm phù nề, hồ sơ hình ảnh trước/sau và phác đồ chuyên biệt
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-slate-200 px-3 pt-2 overflow-x-auto no-scrollbar space-x-2">
        <button
          onClick={() => setActiveTab('diary')}
          className={`py-2.5 px-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'diary'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Nhật ký trị liệu (D03)
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={`py-2.5 px-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'packages'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Gói liệu trình (D01)
        </button>
        <button
          onClick={() => setActiveTab('before_after')}
          className={`py-2.5 px-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'before_after'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Trước / Sau (D02)
        </button>
        <button
          onClick={() => setActiveTab('assessment')}
          className={`py-2.5 px-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'assessment'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Kiểm tra phù nề
        </button>
      </div>

      {/* Tab 1: Nhật ký lâm sàng D03 */}
      {activeTab === 'diary' && (
        <div className="p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <strong>Phác đồ cá nhân hóa:</strong> Số đo chu vi mô và mức độ xơ hóa được cập nhật trực tiếp sau mỗi phiên dẫn lưu bạch huyết Vodder bởi chuyên viên phụ trách.
            </div>
          </div>

          <div className="space-y-3">
            {DEFAULT_DIARY_ENTRIES.map((entry) => (
              <div key={entry.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                      Buổi {entry.sessionNumber}
                    </span>
                    <span className="text-xs font-medium text-slate-500 flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {entry.date}
                    </span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Hiệu quả {entry.reductionRate}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1">{entry.therapy}</h3>
                <p className="text-xs text-slate-600 mb-2">
                  <strong className="text-slate-700">Vùng can thiệp:</strong> {entry.targetArea}
                </p>

                {/* Đo lường trước sau */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs mb-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Trước buổi học:</span>
                    <span className="font-semibold text-rose-600">{entry.edemaBefore}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Sau trị liệu:</span>
                    <span className="font-semibold text-emerald-600">{entry.edemaAfter}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50/70 p-2 rounded-lg border-l-2 border-blue-500">
                  <p className="font-medium text-slate-700 mb-0.5">Lời dặn của chuyên viên {entry.specialistName}:</p>
                  <p className="italic text-slate-500">"{entry.notes}"</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={onBookAppointment}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Đặt lịch phiên trị liệu kế tiếp</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Gói liệu trình D01 */}
      {activeTab === 'packages' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded uppercase font-semibold">
                    Đang hoạt động
                  </span>
                  <h3 className="text-base font-bold mt-1">Phác đồ Vodder Phục hồi Phù nề Y khoa</h3>
                  <p className="text-xs text-blue-100 mt-0.5">Chi nhánh: MLD Center Quận 3, TP.HCM</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black">3/6</span>
                  <p className="text-[10px] text-blue-100">Buổi hoàn thành</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-blue-900/40 rounded-full h-2 mt-3 overflow-hidden">
                <div className="bg-emerald-400 h-2 rounded-full transition-all" style={{ width: '50%' }}></div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-600 border-b border-slate-100 pb-2">
                <span>Chuyên viên chính:</span>
                <span className="font-semibold text-slate-800">Trần Minh Phương (Master Vodder)</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 border-b border-slate-100 pb-2">
                <span>Hạn sử dụng gói:</span>
                <span className="font-semibold text-slate-800">31/12/2026</span>
              </div>


              <div className="pt-2 flex space-x-2">
                <button
                  onClick={onBookAppointment}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition"
                >
                  Đặt lịch buổi 4
                </button>
                <a
                  href="tel:0967786399"
                  className="py-2.5 px-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition flex items-center justify-center text-xs font-semibold"
                >
                  <PhoneCall className="w-3.5 h-3.5 mr-1" />
                  Hotline
                </a>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 rounded-xl p-4 text-center text-xs text-slate-500">
            Cần điều chỉnh phác đồ hoặc dời lịch? Vui lòng liên hệ chuyên viên trước 4 tiếng.
          </div>
        </div>
      )}

      {/* Tab 3: Trước / Sau D02 */}
      {activeTab === 'before_after' && (
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-600">
            Các ca lâm sàng thực tế được thực hiện bằng phương pháp Dẫn lưu Bạch huyết gốc Vodder (Dr. Emil Vodder Method).
          </p>

          <div className="space-y-4">
            {BEFORE_AFTER_CASES.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-3 bg-slate-50 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
                      {item.duration}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 p-2 bg-slate-900">
                  <div className="relative">
                    <img src={item.beforeImage} alt="Trước" className="w-full h-36 object-cover rounded" />
                    <span className="absolute bottom-1.5 left-1.5 bg-rose-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      TRƯỚC
                    </span>
                  </div>
                  <div className="relative">
                    <img src={item.afterImage} alt="Sau" className="w-full h-36 object-cover rounded" />
                    <span className="absolute bottom-1.5 left-1.5 bg-emerald-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      SAU
                    </span>
                  </div>
                </div>

                <div className="p-3 text-xs text-slate-600">
                  <p className="text-slate-700 leading-relaxed">{item.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Form Đăng ký kiểm tra phù nề */}
      {activeTab === 'assessment' && (
        <div className="p-4">
          {submitSuccess ? (
            <div className="bg-white rounded-xl border border-emerald-200 p-6 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Đã gửi yêu cầu đánh giá phù nề!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chuyên gia trị liệu MLD Vietnam sẽ xem xét tình trạng và liên hệ qua số điện thoại <strong>{phone}</strong> trong vòng 30 phút để tư vấn phác đồ phù hợp.
              </p>
              <button
                onClick={() => setSubmitSuccess(false)}
                className="py-2.5 px-5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Gửi thêm yêu cầu khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleAssessmentSubmit} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3.5">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">Đăng ký Thăm khám & Đánh giá Phù nề</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chuyên viên Master Vodder phân loại mức độ và tư vấn phác đồ miễn phí
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Số điện thoại liên hệ</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Vị trí sưng phù cần thăm khám</label>
                <select
                  value={affectedArea}
                  onChange={(e) => setAffectedArea(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                >
                  <option value="Vùng mặt / Cổ">Vùng mặt / Cổ sau phẫu thuật thẩm mỹ</option>
                  <option value="Cánh tay / Nách">Cánh tay / Nách (Hậu phẫu ung thư vú/hạch)</option>
                  <option value="Chi dưới / Bắp chân">Chi dưới / Cẳng bàn chân (Phù Lymphedema)</option>
                  <option value="Vùng bụng & Hông">Vùng bụng & Hông sau hút mỡ / phẫu thuật</option>
                  <option value="Khác">Khu vực khác</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Mức độ phù nề hiện tại</label>
                <select
                  value={edemaSeverity}
                  onChange={(e) => setEdemaSeverity(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                >
                  <option value="Độ 1 - Phù nhẹ, ấn lõm hồi phục nhanh">Độ 1 - Phù nhẹ, ấn lõm hồi phục nhanh</option>
                  <option value="Độ 2 - Phù ấn lõm rõ rệt, da bắt đầu căng cứng">Độ 2 - Phù ấn lõm rõ rệt, da bắt đầu căng cứng</option>
                  <option value="Độ 3 - Phù cứng, không ấn lõm, da sần bì sượng">Độ 3 - Phù cứng, không ấn lõm, da sần bì sượng</option>
                  <option value="Độ 4 - Xơ hóa nặng">Độ 4 - Xơ hóa nặng / Voi hóa mô mỡ</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="hasSurgery"
                  checked={hasSurgery}
                  onChange={(e) => setHasSurgery(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300"
                />
                <label htmlFor="hasSurgery" className="text-xs text-slate-700 font-medium">
                  Có tiền sử phẫu thuật / xạ trị trong 6 tháng gần đây
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Mô tả triệu chứng thêm (Tùy chọn)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                  placeholder="Ví dụ: Tê bì về đêm, cảm giác căng tức khi cử động..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                {isSubmitting ? 'Đang gửi thông tin...' : 'Gửi yêu cầu đánh giá phù nề'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

