export function portalTarget(value?:string|null) {
  const raw=value?.trim()||'';
  if(/^https:\/\//i.test(raw)){
    try{const url=new URL(raw);if(!url.username&&!url.password)return {external:url.href};}catch{/* Invalid admin links remain a readable banner. */}
    return null;
  }
  const routes:Record<string,string>={
    '/academy':'academy','/academy/courses':'academy','/academy/my-courses':'learning','/academy/enrollment':'academy',
    '/services':'services','/services/vodder':'services','/treatment/packages':'packages','/treatment/journal':'journal',
    '/treatment/lymph-examination':'examination',
    '/booking':'new-booking','/booking/appointments':'booking','/documents':'documents','/branches':'branches',
    '/profile':'profile','/profile/vouchers':'vouchers','/profile/notifications':'notifications','/community':'community',
    '/notifications':'notifications','/home/search':'search','/specialists':'specialists',
    '/academy/attendance':'schedule','/academy/results':'results',
    '/profile/edit':'profile-edit','/profile/settings':'profile-settings','/profile/support':'support',
    '/treatment/my-packages':'packages','/treatment/care-journal':'journal',
    '/treatment/home-care':'care_guide','/treatment/home-care-guidelines':'care_guide',
    '/treatment/consultation':'consultation','/treatment/pre-service-consultation':'consultation',
    '/treatment/review':'review','/treatment/service-review':'review',
  };
  const path=raw.split(/[?#]/,1)[0].replace(/\/+$/,'');
  return routes[path]?{screen:routes[path]}:null;
}
