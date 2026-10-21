import {getRouteParams,getShareableLink,openShareSheet} from 'zmp-sdk';
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function launchServiceId() {
  let id=new URL(location.href).searchParams.get('serviceId');
  try {id=getRouteParams()?.serviceId||id;} catch { /* Browser previews use URL parameters. */ }
  return id&&uuid.test(id)?id:null;
}
export async function shareService(service:{id:string;title:string;description:string;image?:string}) {
  const path=`/?serviceId=${encodeURIComponent(service.id)}`;
  const inside=/Zalo/i.test(navigator.userAgent)||Boolean((window as any).ZJSBridge);
  const url=inside?await getShareableLink({title:service.title,description:service.description,path,...(service.image?.startsWith('https://')?{thumbnail:service.image}:{})}):new URL(path,location.origin).href;
  if(inside) await openShareSheet({type:'link',data:{link:url}});
  else if(navigator.share) await navigator.share({title:service.title,text:service.description,url});
  else if(navigator.clipboard?.writeText) {await navigator.clipboard.writeText(url);return 'Đã sao chép liên kết dịch vụ.';}
  else throw new Error('Không thể chia sẻ trên thiết bị này.');
  return '';
}
