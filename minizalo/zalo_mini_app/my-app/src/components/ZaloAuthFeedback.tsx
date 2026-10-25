import React from 'react';

export function ZaloAuthFeedback({error,issue,className=''}:{error:string;issue?:string;className?:string}){
  if(!error)return null;
  const code=issue==='STAFF_ACCESS_REQUIRED'||issue==='STAFF_PROFILE_INACTIVE'||issue==='STAFF_ACCOUNT_NOT_FOUND'?issue:null;
  return <div role="alert" data-auth-issue={code||undefined} className={className}>
    <p>{error}</p>
    {code==='STAFF_ACCESS_REQUIRED'&&<p className="mt-2">Nếu đã có hồ sơ nhân viên, hãy nhờ quản trị viên mở Tài khoản liên kết với hồ sơ đó và kiểm tra Vai trò tài khoản. Chọn bộ phận hoặc chức vụ trong hồ sơ chưa cấp quyền đăng nhập.</p>}
    {code&&<p className="mt-2 break-words text-[10px] font-medium">Mã hỗ trợ: {code}</p>}
  </div>;
}
