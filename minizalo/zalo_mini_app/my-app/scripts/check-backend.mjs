import {loadEnv} from 'vite';
import {checkBackendContract} from './backend-contract.mjs';

try {
  // Match Vite production resolution, including .env.production.local and shell overrides.
  const env=loadEnv('production',process.cwd(),'VITE_');
  const base=new URL(env.VITE_API_BASE_URL);
  if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw new Error('VITE_API_BASE_URL phải là URL HTTPS hợp lệ, không chứa thông tin đăng nhập.');
  console.log(`Kiểm tra BE Mini App: ${base.origin}${base.pathname}`);
  const response=await fetch(base.href.replace(/\/$/,'')+'/health',{
    headers:{Accept:'application/json',Origin:'https://h5.zdn.vn'},redirect:'error',signal:AbortSignal.timeout(45000),
  });
  if(!response.ok)throw new Error(`BE không sẵn sàng (HTTP ${response.status}).`);
  const missing=checkBackendContract(await response.json());
  if(missing.length)throw new Error(`BE đang chạy bản cũ, thiếu: ${missing.join(', ')}. Deploy minizalo/backend nhánh develop trước khi đẩy Mini App testing.`);
  const cors=response.headers.get('access-control-allow-origin');
  if(cors!=='*'&&cors!=='https://h5.zdn.vn')throw new Error('BE chưa cho phép origin https://h5.zdn.vn.');
  console.log('BE tương thích với bản Mini App này.');
} catch(error) {
  // Never print transport internals, response bodies or deployment credentials.
  console.error(error instanceof SyntaxError?'BE trả về dữ liệu không hợp lệ.':error instanceof TypeError||error?.name==='TimeoutError'?'Không kết nối được BE. Kiểm tra URL, mạng và trạng thái máy chủ.':error.message);
  process.exitCode=1;
}
