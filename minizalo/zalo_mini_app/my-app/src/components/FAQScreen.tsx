import React, { useMemo, useState } from 'react';

const FAQ_CATEGORIES = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'DICH_VU', label: 'Dịch vụ & Trị liệu' },
  { id: 'DAT_LICH', label: 'Đặt lịch & Cơ sở' },
  { id: 'DAO_TAO', label: 'Đào tạo & Học phí' },
  { id: 'HOI_VIEN', label: 'Hội viên & Ưu đãi' },
];

const DEFAULT_FAQS = [
  {
    id: 'faq-1',
    category: 'DICH_VU',
    question: 'Dẫn lưu bạch huyết (MLD) chuẩn Vodder phù hợp với đối tượng nào?',
    answer:
      'Phương pháp hỗ trợ hiệu quả cho người bị phù bạch huyết tay/chân sau phẫu thuật, sưng nề sau chấn thương hoặc thẩm mỹ, người cần giảm ứ trệ dịch và tăng cường miễn dịch.',
  },
  {
    id: 'faq-2',
    category: 'DAT_LICH',
    question: 'Làm sao để đặt lịch và chọn khung giờ phù hợp?',
    answer:
      'Quý khách chọn dịch vụ hoặc gói liệu trình, chọn chi nhánh gần nhất, chọn ngày và khung giờ hiển thị trực tiếp trên ứng dụng rồi bấm xác nhận đặt lịch.',
  },
  {
    id: 'faq-3',
    category: 'DAO_TAO',
    question: 'Người chưa có nền tảng y khoa có tham gia khóa đào tạo được không?',
    answer:
      'Học viện MLD Việt Nam thiết kế lộ trình phân tầng từ Người mới bắt đầu đến Đang làm nghề và Y bác sĩ, giúp học viên nắm chắc giải phẫu và thực hành chuẩn quốc tế.',
  },
  {
    id: 'faq-4',
    category: 'HOI_VIEN',
    question: 'Làm thế nào để sử dụng Voucher ưu đãi và gói liệu trình đã mua?',
    answer:
      'Tại màn hình Đặt lịch trị liệu, quý khách có thể chọn gói liệu trình đang sở hữu (mỗi buổi tương ứng 1 ca) hoặc nhập mã ưu đãi từ Ví voucher để được giảm giá trực tiếp.',
  },
];

export type PortalFaqItem = {
  id: string;
  category?: string;
  question: string;
  answer: string;
};

export function FAQScreen({
  faqs,
  onBack,
  onSupport,
  initialCategory = 'ALL',
}: {
  faqs?: PortalFaqItem[];
  onBack: () => void;
  onSupport: () => void;
  initialCategory?: string;
}) {
  const sourceFaqs = Array.isArray(faqs) && faqs.length > 0 ? faqs : DEFAULT_FAQS;
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(sourceFaqs[0]?.id || null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sourceFaqs.filter((item) => {
      if (category !== 'ALL' && (item.category || '') !== category) return false;
      if (!q) return true;
      return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
    });
  }, [sourceFaqs, category, query]);

  return (
    <section className="mobile-body faq-screen">
      <header className="mobile-page-header">
        <button type="button" onClick={onBack}>
          Quay lại
        </button>
        <h1>Câu hỏi thường gặp (FAQ)</h1>
      </header>
      <label className="mobile-field">
        Tìm kiếm câu hỏi
        <input
          type="search"
          placeholder="Nhập từ khóa câu hỏi..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="mobile-chips" role="tablist" aria-label="Danh mục câu hỏi">
        {FAQ_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p>Không tìm thấy câu hỏi phù hợp.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const isOpen = expandedId === item.id;
            return (
              <article key={item.id} className="mobile-card p-4">
                <button
                  type="button"
                  className="w-full text-left flex items-center justify-between gap-2 font-bold text-sm"
                  aria-expanded={isOpen}
                  onClick={() => setExpandedId(isOpen ? null : item.id)}
                >
                  <span>{item.question}</span>
                  <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && <p className="mt-2 text-sm text-slate-600">{item.answer}</p>}
              </article>
            );
          })}
        </div>
      )}
      <button type="button" className="mobile-primary" onClick={onSupport}>
        Gửi yêu cầu hỗ trợ trực tiếp
      </button>
    </section>
  );
}
