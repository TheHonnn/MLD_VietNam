const fs = require('fs');

const filePath = './web-admin/src/pages/W18_PortalContent.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. In isDocModalOpen: replace summary and image input to add contentText and MediaUploadInput for image
const oldDocFormBlock = `              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tóm tắt chuyên môn</label>
                <textarea
                  rows={2}
                  value={editingDoc.summary || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, summary: e.target.value })}
                  placeholder="Mô tả mục tiêu và nội dung tài liệu..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Tải lên file tài liệu PDF / DOC *</label>
                <MediaUploadInput
                  value={editingDoc.fileUrl || editingDoc.targetLink || ''}
                  onChange={(url, size) =>
                    setEditingDoc({
                      ...editingDoc,
                      fileUrl: url,
                      targetLink: url,
                      fileSizeBytes: size || editingDoc.fileSizeBytes || 0,
                    })
                  }
                  accept=".pdf,.doc,.docx,.zip"
                  isDocument={true}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Phân quyền học viên</label>
                  <select
                    value={editingDoc.accessLevel || 'MEMBERS_ONLY'}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, accessLevel: e.target.value as DocumentAccessLevel })
                    }
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="MEMBERS_ONLY">Chỉ học viên khóa học (Members Only)</option>
                    <option value="FREE_TRIAL">Cho phép đọc thử (Free Trial)</option>
                    <option value="PUBLIC">Mở công khai (Public)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Chuyên mục tài liệu</label>
                  <select
                    value={editingDoc.category || 'GIAI_PHAU'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="GIAI_PHAU">Giải phẫu hệ mạch</option>
                    <option value="LAM_SANG">Phác đồ lâm sàng</option>
                    <option value="BANG_EP">Băng ép đa lớp</option>
                    <option value="NGHIEN_CUU">Nghiên cứu y khoa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Tác giả / Hội đồng thẩm định</label>
                  <input
                    type="text"
                    value={editingDoc.authorName || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, authorName: e.target.value })}
                    placeholder="Hội đồng Chuyên môn MLD"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Ảnh bìa giáo trình (Tùy chọn)</label>
                  <input
                    type="url"
                    value={editingDoc.imageUrl || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, imageUrl: e.target.value })}
                    placeholder="https://... ảnh bìa"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>`;

const newDocFormBlock = `              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tóm tắt chuyên môn</label>
                <textarea
                  rows={2}
                  value={editingDoc.summary || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, summary: e.target.value })}
                  placeholder="Mô tả tóm tắt mục tiêu và nội dung tài liệu..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Toàn văn nội dung tài liệu / Bài viết chi tiết</label>
                <textarea
                  rows={6}
                  value={editingDoc.contentText || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, contentText: e.target.value })}
                  placeholder="Nhập toàn văn tài liệu hoặc bài viết chuyên môn (các đề mục, phác đồ, dẫn chứng y khoa)..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] font-mono leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Tải lên file tài liệu PDF / DOC *</label>
                <MediaUploadInput
                  value={editingDoc.fileUrl || editingDoc.targetLink || ''}
                  onChange={(url, size) =>
                    setEditingDoc({
                      ...editingDoc,
                      fileUrl: url,
                      targetLink: url,
                      fileSizeBytes: size || editingDoc.fileSizeBytes || 0,
                    })
                  }
                  accept=".pdf,.doc,.docx,.zip"
                  isDocument={true}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Phân quyền học viên</label>
                  <select
                    value={editingDoc.accessLevel || 'MEMBERS_ONLY'}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, accessLevel: e.target.value as DocumentAccessLevel })
                    }
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="MEMBERS_ONLY">Chỉ học viên khóa học (Members Only)</option>
                    <option value="FREE_TRIAL">Cho phép đọc thử (Free Trial)</option>
                    <option value="PUBLIC">Mở công khai (Public)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Chuyên mục tài liệu</label>
                  <select
                    value={editingDoc.category || 'GIAI_PHAU'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="GIAI_PHAU">Giải phẫu hệ mạch</option>
                    <option value="LAM_SANG">Phác đồ lâm sàng</option>
                    <option value="Xương khớp & Phục hồi">Xương khớp & Phục hồi</option>
                    <option value="BANG_EP">Băng ép đa lớp</option>
                    <option value="NGHIEN_CUU">Nghiên cứu y khoa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tác giả / Hội đồng thẩm định</label>
                <input
                  type="text"
                  value={editingDoc.authorName || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, authorName: e.target.value })}
                  placeholder="Hội đồng Chuyên môn MLD"
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">Ảnh bìa giáo trình / bài viết (Tải lên hoặc dán URL)</label>
                <MediaUploadInput
                  value={editingDoc.imageUrl || ''}
                  onChange={(url) => setEditingDoc({ ...editingDoc, imageUrl: url })}
                  aspectRatio="16:9"
                  accept="image/*"
                  isDocument={false}
                />
              </div>`;

// Normalize CRLF to LF for matching
const normContent = content.replace(/\r\n/g, '\n');
const normOldBlock = oldDocFormBlock.replace(/\r\n/g, '\n');
const normNewBlock = newDocFormBlock.replace(/\r\n/g, '\n');

if (normContent.includes(normOldBlock)) {
  content = normContent.replace(normOldBlock, normNewBlock);
  console.log('Successfully replaced doc form block!');
} else {
  console.error('Could not find normOldBlock!');
}

// 2. In isCreatePostModalOpen: Add file upload & category picker
const oldPostForm = `              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Nội dung chi tiết ca bệnh / kỹ thuật *</label>
                <textarea
                  rows={5}
                  required
                  value={newPostData.contentText || ''}
                  onChange={(e) => setNewPostData({ ...newPostData, contentText: e.target.value, summary: e.target.value.slice(0, 150) })}
                  placeholder="Nhập nội dung chia sẻ kinh nghiệm, lưu ý thao tác tay, phác đồ điều trị..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Ảnh minh họa ca lâm sàng (Tùy chọn)</label>
                <MediaUploadInput
                  value={newPostData.imageUrl || ''}
                  onChange={(url) => setNewPostData({ ...newPostData, imageUrl: url })}
                  aspectRatio="16:9"
                />
              </div>`;

const newPostForm = `              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Chuyên mục bài viết</label>
                  <select
                    value={newPostData.category || 'CHIA_SE_KINH_NGHIEM'}
                    onChange={(e) => setNewPostData({ ...newPostData, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  >
                    <option value="Xương khớp & Phục hồi">Xương khớp & Phục hồi</option>
                    <option value="Kỹ thuật MLD Vodder">Kỹ thuật MLD Vodder</option>
                    <option value="Giảm phù nề hậu phẫu">Giảm phù nề hậu phẫu</option>
                    <option value="Chăm sóc tại nhà">Chăm sóc tại nhà</option>
                    <option value="Nghiên cứu y khoa">Nghiên cứu y khoa</option>
                    <option value="CHIA_SE_KINH_NGHIEM">Chia sẻ kinh nghiệm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1">Tác giả</label>
                  <input
                    type="text"
                    value={newPostData.authorName || ''}
                    onChange={(e) => setNewPostData({ ...newPostData, authorName: e.target.value })}
                    placeholder="Hội đồng Chuyên môn MLD"
                    className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Nội dung chi tiết ca bệnh / Toàn văn bài viết *</label>
                <textarea
                  rows={6}
                  required
                  value={newPostData.contentText || ''}
                  onChange={(e) => setNewPostData({ ...newPostData, contentText: e.target.value, summary: e.target.value.slice(0, 150) })}
                  placeholder="Nhập toàn văn bài viết, ca lâm sàng, phác đồ điều trị..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-[#2C241E] focus:outline-none focus:border-[#985018] font-mono leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Ảnh minh họa bài viết (Tùy chọn)</label>
                <MediaUploadInput
                  value={newPostData.imageUrl || ''}
                  onChange={(url) => setNewPostData({ ...newPostData, imageUrl: url })}
                  aspectRatio="16:9"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1">Tải lên file tài liệu đính kèm (PDF / DOC - Tùy chọn)</label>
                <MediaUploadInput
                  value={newPostData.fileUrl || newPostData.targetLink || ''}
                  onChange={(url, size) =>
                    setNewPostData({
                      ...newPostData,
                      fileUrl: url,
                      targetLink: url,
                      fileSizeBytes: size || 0,
                    })
                  }
                  accept=".pdf,.doc,.docx"
                  isDocument={true}
                />
              </div>`;

const normOldPost = oldPostForm.replace(/\r\n/g, '\n');
const normNewPost = newPostForm.replace(/\r\n/g, '\n');

if (content.includes(normOldPost)) {
  content = content.replace(normOldPost, normNewPost);
  console.log('Successfully replaced post form block!');
} else {
  console.error('Could not find normOldPost!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Saved W18_PortalContent.tsx successfully!');

