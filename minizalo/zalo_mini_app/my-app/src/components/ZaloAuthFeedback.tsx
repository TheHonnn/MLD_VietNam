import React from 'react';

export function ZaloAuthFeedback({error,issue,className=''}:{error:string;issue?:string;className?:string}){
  if(!error)return null;
  const code=issue==='STAFF_ACCESS_REQUIRED'||issue==='STAFF_PROFILE_INACTIVE'||issue==='STAFF_ACCOUNT_NOT_FOUND'?issue:null;
  return <div role="alert" data-auth-issue={code||undefined} className={className}>
    <p>{code?'Máy chủ vẫn đang kiểm tra hồ sơ nhân viên khi đăng nhập. Cần cập nhật BE Mini App sang luồng đăng nhập Zalo chung.':error}</p>
    {code&&<p className="mt-2 break-words text-[10px] font-medium">Mã hỗ trợ: {code}</p>}
  </div>;
}
