import React, { useState, useEffect } from 'react';
import { supabaseApi } from '@/api/supabase';
import { CommunityPost } from '@/core/types';
import {
  FileText,
  Heart,
  Eye,
  Share2,
  Download,
  BookOpen,
  CheckCircle,
  ExternalLink,
  X,
  Stethoscope,
  Sparkles,
} from 'lucide-react';

interface ClinicalDocument {
  id: string;
  title: string;
  category: string;
  author: string;
  pages: number;
  fileSize: string;
  fileUrl: string;
  summary: string;
}

const CLINICAL_DOCUMENTS: ClinicalDocument[] = [
  {
    id: 'doc-1',
    title: 'Phác đồ Dẫn lưu Bạch huyết Thủ công Vodder trong Phục hồi Phù nề Hậu phẫu Thẩm mỹ',
    category: 'Phác đồ Lâm sàng',
    author: 'Hội Đồng Y Khoa MLD Vietnam & Hiệp hội Vodder Quốc Tế',
    pages: 28,
    fileSize: '3.4 MB',
    fileUrl: 'https://mldvietnam.vn/docs/vodder_post_op_guidelines.pdf',
    summary: 'Hướng dẫn chuẩn hóa quy trình can thiệp MLD cho bệnh nhân sau phẫu thuật tạo hình ngực, gọt hàm, hút mỡ nhằm rút ngắn 50% thời gian tiêu sưng.',
  },
  {
    id: 'doc-2',
    title: 'Quản lý Phù Bạch huyết (Lymphedema) Chi Trên Sau Phẫu Thuật Ung Thư Vú',
    category: 'Nghiên cứu Y học',
    author: 'ThS.BS Trần Kim Dung',
    pages: 42,
    fileSize: '5.1 MB',
    fileUrl: 'https://mldvietnam.vn/docs/lymphedema_breast_cancer_management.pdf',
    summary: 'Tổng quan hệ thống về liệu pháp phức hợp giảm phù nề (CDT), kỹ thuật băng ép đa lớp và bảo tồn da cho bệnh nhân sau nạo vét hạch nách.',
  },
  {
    id: 'doc-3',
    title: 'Tài liệu hướng dẫn Chăm sóc Giảm áp & Bài tập Bạch huyết Tại Nhà',
    category: 'Hướng dẫn Bệnh nhân',
    author: 'Học viện Đào tạo MLD Vietnam',
    pages: 16,
    fileSize: '2.2 MB',
    fileUrl: 'https://mldvietnam.vn/docs/homecare_mld_exercises.pdf',
    summary: 'Sổ tay bỏ túi dành cho người bệnh và người chăm sóc, các động tác hít thở sâu bụng và kích hoạt hạch trung tâm an toàn tại nhà.',
  },
];

export const CommunityScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'posts' | 'documents'>('posts');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [selectedDoc, setSelectedDoc] = useState<ClinicalDocument | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const data = await supabaseApi.getCommunityPosts();
    setPosts(data);
    setLoading(false);
  };

  const handleToggleLike = (postId: string) => {
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  return (
    <div className="min-h-full bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 rounded-b-2xl shadow-md">
        <div className="flex items-center space-x-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
          <Stethoscope className="w-4 h-4 text-emerald-300" />
          <span>Cộng đồng & Tư liệu Y khoa Vodder</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Kiến thức & Ca Lâm sàng</h1>
        <p className="text-xs text-blue-100 mt-1">
          Chia sẻ nghiên cứu y học chứng cứ, phác đồ điều trị và tài liệu chuyên môn
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-slate-200 px-4 pt-2">
        <button
          onClick={() => setActiveTab('posts')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Bài viết Lâm sàng (D11)
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'documents'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Tài liệu & Phác đồ (B07)
        </button>
      </div>

      {/* Tab 1: Bài viết lâm sàng D11 */}
      {activeTab === 'posts' && (
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">Đang tải bài viết lâm sàng...</div>
          ) : (
            posts.map((post) => {
              const isLiked = likedPostIds.has(post.id);
              const likes = post.likesCount + (isLiked ? 1 : 0);

              return (
                <div
                  key={post.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition"
                >
                  {/* Author Header */}
                  <div className="p-3.5 flex items-center space-x-3 border-b border-slate-100">
                    <img
                      src={post.authorAvatar}
                      alt={post.authorName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">{post.authorName}</span>
                        <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      </div>
                      <span className="text-[10px] text-slate-500 block">{post.authorRole}</span>
                    </div>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                      {post.category}
                    </span>
                  </div>

                  {/* Post Content */}
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-slate-900 mb-1.5 leading-snug">{post.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{post.summary}</p>

                    {post.imageUrl && (
                      <div className="rounded-lg overflow-hidden my-3 max-h-52 bg-slate-100">
                        <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Likes & Views */}
                    <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => handleToggleLike(post.id)}
                          className={`flex items-center space-x-1 transition ${
                            isLiked ? 'text-rose-600 font-bold' : 'text-slate-500 hover:text-rose-500'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-600' : ''}`} />
                          <span>{likes}</span>
                        </button>

                        <div className="flex items-center space-x-1">
                          <Eye className="w-4 h-4 text-slate-400" />
                          <span>{post.viewsCount} lượt xem</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ title: post.title, text: post.summary, url: window.location.href }).catch(() => {});
                          } else {
                            alert('Đã sao chép liên kết bài viết lâm sàng!');
                          }
                        }}
                        className="text-slate-500 hover:text-blue-600 flex items-center space-x-1"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Chia sẻ</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Tài liệu y khoa B07 */}
      {activeTab === 'documents' && (
        <div className="p-4 space-y-3.5">
          <p className="text-xs text-slate-600">
            Kho thư viện phác đồ và tài liệu lâm sàng được phê duyệt bởi Hội Đồng Y Khoa MLD Vietnam.
          </p>

          <div className="space-y-3">
            {CLINICAL_DOCUMENTS.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase">
                        {doc.category} · PDF
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug">{doc.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Tác giả: {doc.author}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg">
                  {doc.summary}
                </p>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    {doc.pages} trang · Dung lượng: {doc.fileSize}
                  </span>

                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="py-1.5 px-3 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center space-x-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Mở đọc tài liệu</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: B07 Document Reader Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-red-400" />
                <span className="text-xs font-bold truncate max-w-[240px]">{selectedDoc.title}</span>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document simulated preview */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-100">
              <div className="bg-white p-6 rounded-xl shadow border border-slate-200 space-y-4">
                <div className="text-center border-b border-slate-200 pb-4">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM · MLD VIETNAM
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">{selectedDoc.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedDoc.author}</p>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed space-y-2.5">
                  <h5 className="font-bold text-slate-900">1. TỔNG QUAN NGUYÊN LÝ LÂM SÀNG</h5>
                  <p>
                    Hệ bạch huyết là mạng lưới bảo vệ và cân bằng dịch mô trọng yếu của cơ thể con người. Dẫn lưu Bạch huyết Thủ công (Manual Lymphatic Drainage - MLD) theo trường phái Dr. Emil Vodder được ghi nhận là tiêu chuẩn vàng trên toàn thế giới trong việc xử lý các triệu chứng ứ trệ dịch, phù nề hậu phẫu thẩm mỹ và phù bạch huyết mạn tính.
                  </p>
                  <h5 className="font-bold text-slate-900">2. NGUYÊN TẮC THAO TÁC CƠ BẢN</h5>
                  <p>
                    - Áp lực tay dao động trong khoảng 30 - 40 mmHg.<br />
                    - Thao tác kéo dãn mô theo hướng dòng chảy bạch huyết về hạch bạch huyết chức năng lân cận.<br />
                    - Thứ tự: Luôn giải phóng hạch trung tâm (Terminus cổ) trước khi can thiệp ngoại vi.
                  </p>
                  <h5 className="font-bold text-slate-900">3. CHỐNG CHỈ ĐỊNH</h5>
                  <p>
                    - Nhiễm trùng cấp tính, viêm quầng (Erysipelas).<br />
                    - Huyết khối tĩnh mạch sâu (DVT) chưa điều trị ổn định.<br />
                    - Suy tim sung huyết mất bù.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-500">{selectedDoc.fileSize} · Bản phát hành y khoa</span>
              <button
                onClick={() => {
                  alert(`Đang tải tệp: ${selectedDoc.title}`);
                }}
                className="py-2 px-4 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải về PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

