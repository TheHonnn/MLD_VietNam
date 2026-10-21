import React, { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftIcon } from './Icons';
import { useBackAction } from '@/hooks/useNavigationHistory';

const publicUrl = (value: unknown) => {
  try {
    const url = new URL(typeof value === 'string' ? value : '');
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
};
export function LegalLinks() {
  const [draft,setDraft]=useState<'privacy'|'terms'|null>(null);
  const headingId=useId();
  useBackAction(Boolean(draft),()=>setDraft(null),2);
  const privacy = publicUrl(import.meta.env.VITE_PRIVACY_POLICY_URL);
  const terms = publicUrl(import.meta.env.VITE_TERMS_URL);
  return <>
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 py-3 text-xs text-[#98501B]">
      {privacy ? <a href={privacy} target="_blank" rel="noopener noreferrer" className="underline">Chính sách bảo mật</a>
        : <button type="button" className="min-h-10 underline" onClick={()=>setDraft('privacy')}>Chính sách bảo mật</button>}
      {terms ? <a href={terms} target="_blank" rel="noopener noreferrer" className="underline">Điều khoản sử dụng</a>
        : <button type="button" className="min-h-10 underline" onClick={()=>setDraft('terms')}>Điều khoản sử dụng</button>}
    </div>
    {draft && createPortal(<section role="dialog" aria-modal="true" aria-labelledby={headingId} className="absolute inset-0 z-[250] flex min-h-0 flex-col bg-[#FAF6F0] text-left text-[#40352F]">
      <header className="flex shrink-0 items-center gap-3 border-b p-4">
        <button type="button" aria-label="Đóng chính sách" title="Đóng chính sách" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-white" onClick={()=>setDraft(null)} autoFocus><ArrowLeftIcon size={20}/></button>
        <h1 id={headingId} className="min-w-0 break-words text-lg font-bold">{draft==='privacy'?'Chính sách bảo mật':'Điều khoản sử dụng'}</h1>
      </header>
      <article className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-sm leading-6" style={{paddingBottom:'max(20px, var(--app-safe-bottom, 20px))'}}>
        <p className="rounded-lg border border-[#D5B99C] bg-white p-3"><strong>Bản dự thảo minh họa.</strong> Nội dung chưa phải chính sách chính thức được MLD phê duyệt.</p>
        {draft==='privacy'?<>
          <section><h2 className="font-bold">Thông tin sử dụng</h2><p>Số điện thoại được dùng để xác minh tài khoản Zalo và kết nối hồ sơ khách hàng. Tên, ảnh đại diện, ngày sinh, giới tính và email do bạn cung cấp trong hồ sơ.</p></section>
          <section><h2 className="font-bold">Dữ liệu phát sinh</h2><p>Ứng dụng lưu lịch sử tìm kiếm, lịch hẹn, đăng ký khóa học, tiến trình học tập, bài kiểm tra và các thông tin chăm sóc bạn gửi để phục vụ quá trình sử dụng.</p></section>
          <section><h2 className="font-bold">Quyền lựa chọn</h2><p>Bạn có thể xem danh mục dịch vụ mà không chia sẻ số điện thoại. Việc lấy tên và ảnh từ Zalo là tùy chọn; bạn có thể tự điền thông tin hồ sơ.</p></section>
          <section><h2 className="font-bold">Nội dung cần hoàn thiện</h2><p>MLD cần xác nhận đơn vị chịu trách nhiệm dữ liệu, thời hạn lưu trữ, các bên tiếp nhận, thông tin liên hệ và quy trình yêu cầu truy cập, sửa hoặc xóa dữ liệu trước khi phát hành chính thức.</p></section>
        </>:<>
          <section><h2 className="font-bold">Tài khoản và thông tin</h2><p>Bạn cung cấp thông tin chính xác khi hoàn thiện hồ sơ và sử dụng tài khoản của mình để đặt lịch, đăng ký học hoặc gửi yêu cầu hỗ trợ.</p></section>
          <section><h2 className="font-bold">Lịch hẹn và học tập</h2><p>Thông tin dịch vụ, chi nhánh, lịch trống và nội dung học tập được hiển thị theo dữ liệu do đơn vị vận hành cập nhật. Trạng thái xác nhận được thể hiện trong chi tiết lịch hẹn hoặc khóa học.</p></section>
          <section><h2 className="font-bold">Nội dung cần phê duyệt</h2><p>Quy định về thay đổi lịch, trách nhiệm các bên, giải quyết khiếu nại, quyền sở hữu nội dung và hiệu lực điều khoản cần được MLD hoàn thiện, phê duyệt trước khi phát hành chính thức.</p></section>
        </>}
      </article>
    </section>,document.querySelector('.mini-app-shell') || document.body)}
  </>;
}
