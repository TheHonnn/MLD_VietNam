import { abortable } from './async-control';

export async function readAvatar(file: File, signal: AbortSignal): Promise<string> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8*1024*1024) {
    throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WebP không quá 8 MB.');
  }
  const url = URL.createObjectURL(file), image = new Image();
  const timeout = new AbortController();
  const cancel = () => timeout.abort();
  signal.addEventListener('abort',cancel,{once:true});
  if (signal.aborted) cancel();
  const timer = window.setTimeout(cancel,15000);
  try {
    await abortable(new Promise<void>((resolve,reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Không đọc được ảnh. Vui lòng chọn ảnh khác.'));
      image.src = url;
    }),timeout.signal);
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth*image.naturalHeight > 24000000) {
      throw new Error('Ảnh quá lớn. Vui lòng chọn ảnh dưới 24 megapixel.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Thiết bị không xử lý được ảnh.');
    const edge = Math.min(image.naturalWidth,image.naturalHeight);
    context.drawImage(image,(image.naturalWidth-edge)/2,(image.naturalHeight-edge)/2,edge,edge,0,0,512,512);
    return canvas.toDataURL('image/jpeg',0.78);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort',cancel);
    image.onload = image.onerror = null;
    image.src = '';
    URL.revokeObjectURL(url);
  }
}
