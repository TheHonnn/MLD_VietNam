export function portalTarget(value?:string|null) {
  const raw=value?.trim()||'';
  if(/^https:\/\//i.test(raw)){
    try{const url=new URL(raw);if(!url.username&&!url.password)return {external:url.href};}catch{/* Invalid admin links remain a readable banner. */}
    return null;
  }
  const routes:Record<string,string>={
    '/academy':'academy','/academy/courses':'academy','/academy/my-courses':'learning','/academy/enrollment':'academy',
    '/services':'services','/services/vodder':'services','/treatment/packages':'packages','/treatment/journal':'journal',
    '/booking':'new-booking','/booking/appointments':'booking','/documents':'documents','/branches':'branches',
    '/profile':'profile','/profile/vouchers':'vouchers','/profile/notifications':'notifications','/community':'community',
  };
  return routes[raw]?{screen:routes[raw]}:null;
}
