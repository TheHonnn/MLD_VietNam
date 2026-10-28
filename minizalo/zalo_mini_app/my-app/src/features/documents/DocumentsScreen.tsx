import React, { useState, useEffect } from 'react';
import { supabaseApi } from '@/api/supabase';
import { MedicalDocument } from '@/core/types';
import {
  Search,
  X,
  BookOpen,
  MessageSquare,
  Clock,
  User,
  Calendar,
  Share2,
  ChevronLeft,
} from 'lucide-react';

interface DocumentsScreenProps {
  onBackToHome?: () => void;
  onOpenCommunity?: () => void;
}

export const DocumentsScreen: React.FC<DocumentsScreenProps> = ({
  onBackToHome,
  onOpenCommunity,
}) => {
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [categories, setCategories] = useState<string[]>(['Tất cả']);
  const [selectedDoc, setSelectedDoc] = useState<MedicalDocument | null>(null);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await supabaseApi.getDocuments();
      setDocuments(data);

      const cats = new Set<string>(['Tất cả']);
      data.forEach((d) => {
        if (d.category) cats.add(d.category.trim());
      });
      setCategories(Array.from(cats));
    } catch (err) {
      console.warn('Load documents failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchCat = selectedCategory === 'Tất cả' || doc.category === selectedCategory;
    if (!matchCat) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (doc.title || '').toLowerCase().includes(q);
    const summaryMatch = (doc.summary || '').toLowerCase().includes(q);
    const authorMatch = (doc.authorName || '').toLowerCase().includes(q);
    return titleMatch || summaryMatch || authorMatch;
  });

  const renderContentParagraphs = (content: string) => {
    if (!content) return null;
    const paragraphs = content.split('\n\n');

    return paragraphs.map((p, idx) => {
      const trimmed = p.trim();
      if (!trimmed) return null;

      // Check for Markdown image: ![caption](url)
      const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const caption = imgMatch[1];
        const url = imgMatch[2];
        return (
          <div key={idx} className="my-4 text-center">
            <img
              src={url}
              alt={caption}
              className="w-full rounded-xl object-cover shadow-xs"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {caption && (
              <p className="text-xs text-gray-500 italic mt-1.5">{caption}</p>
            )}
          </div>
        );
      }

      // Check for medical headings (e.g. "1. HỖ TRỢ GIẢM PHÙ...", "KHI NÀO...", "KẾT LUẬN")
      const isHeading = /^(\d+\.\s+|KHI NÀO|KẾT LUẬN|TÀI LIỆU)/.test(trimmed);
      if (isHeading) {
        return (
          <h4
            key={idx}
            className="text-base font-bold text-[#1F2937] mt-5 mb-2 leading-snug"
          >
            {trimmed}
          </h4>
        );
      }

      return (
        <p
          key={idx}
          className="text-[14.5px] text-[#334155] leading-relaxed mb-3.5"
        >
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="pb-24 bg-[#F9FAFB] min-h-screen">
      {/* 1. APPBAR: Chuẩn Mobile D09 (22px bold, icon Cộng đồng) */}
      <div className="bg-white px-4 py-3 border-b border-[#E5E7EB] sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-[20px] font-bold text-[#1F2937] tracking-tight">
            Tài liệu & Y khoa MLD
          </h1>
        </div>

        {onOpenCommunity && (
          <button
            onClick={onOpenCommunity}
            className="p-2 text-[#2860EB] hover:bg-[#EFF4FE] rounded-lg transition"
            title="Cộng đồng MLD"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Ô TÌM KIẾM TÀI LIỆU */}
      <div className="bg-white px-4 pt-2.5 pb-3">
        <div className="relative flex items-center bg-[#F1F5F9] rounded-lg border border-[#E5E7EB] px-3 py-2">
          <Search className="w-4 h-4 text-[#2860EB] shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tài liệu, nghiên cứu lâm sàng, bài viết..."
            className="w-full bg-transparent text-[13.5px] text-[#1F2937] placeholder-gray-400 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-0.5 text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. THANH LỌC DANH MỤC NGANG */}
      {categories.length > 1 && (
        <div className="bg-white border-b border-[#E5E7EB] px-4 pb-2.5 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const isSelected = cat === selectedCategory;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isSelected
                    ? 'bg-[#2860EB] text-white font-bold shadow-xs'
                    : 'bg-[#F1F5F9] text-gray-700 hover:bg-gray-200 border border-[#E5E7EB]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. DANH SÁCH THẺ TÀI LIỆU (Chuẩn Mobile D09: Ảnh 185px + Tiêu đề đậm, bo tròn nhẹ 8px) */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <div className="w-8 h-8 border-3 border-[#2860EB] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs">Đang tải tài liệu y khoa...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-bold text-gray-700">Không tìm thấy tài liệu phù hợp</p>
            <p className="text-xs text-gray-400 mt-1">Vui lòng thử từ khóa khác hoặc chọn danh mục khác</p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="bg-white rounded-lg border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
            >
              {/* Ảnh tài liệu 185px */}
              <div className="w-full h-[185px] bg-[#EFF4FE] overflow-hidden relative">
                {doc.imageUrl ? (
                  <img
                    src={doc.imageUrl}
                    alt={doc.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#2860EB]">
                    <BookOpen className="w-12 h-12" />
                  </div>
                )}
              </div>

              {/* Tên tài liệu (chỉ có tên tài liệu, không có văn bản thừa bên dưới) */}
              <div className="p-3.5">
                <h3 className="text-[17px] font-bold text-[#0F172A] leading-snug line-clamp-2">
                  {doc.title}
                </h3>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. MODAL / BOTTOM SHEET CHI TIẾT TÀI LIỆU */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedDoc(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            {/* Thanh kéo */}
            <div className="w-11 h-1 bg-gray-300 rounded-full mx-auto -mt-1 mb-2" />

            {/* Banner ảnh chi tiết */}
            {selectedDoc.imageUrl && (
              <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={selectedDoc.imageUrl}
                  alt={selectedDoc.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Danh mục & Ngày */}
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-md bg-[#EFF4FE] text-[#2860EB] text-[11px] font-bold uppercase tracking-wider">
                {selectedDoc.category || 'TÀI LIỆU Y KHOA'}
              </span>
              {selectedDoc.publishedAt && (
                <span className="text-xs text-gray-500">{selectedDoc.publishedAt}</span>
              )}
            </div>

            {/* Tiêu đề */}
            <h2 className="text-[20px] font-bold text-[#1F2937] leading-tight">
              {selectedDoc.title}
            </h2>

            {/* Tác giả & Thời gian đọc */}
            <div className="flex items-center text-xs text-gray-500 space-x-2">
              <span>{selectedDoc.readTimeMinutes} phút đọc</span>
              <span>·</span>
              <span>{selectedDoc.authorName || 'Hội đồng Y khoa MLD'}</span>
            </div>

            <div className="border-t border-[#E5E7EB]" />

            {/* Tóm tắt y khoa */}
            {selectedDoc.summary && (
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                <p className="text-[14px] font-semibold text-[#1E3A8A] leading-relaxed">
                  {selectedDoc.summary}
                </p>
              </div>
            )}

            {/* Nội dung chi tiết */}
            <div className="text-[14.5px] leading-relaxed">
              {renderContentParagraphs(selectedDoc.content)}
            </div>

            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => setSelectedDoc(null)}
              className="w-full py-3 bg-[#2860EB] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#1E4BB8] transition"
            >
              Đóng tài liệu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
