# Audit truoc khi nop duyet Zalo Mini App

Sau audit đã có bản sửa cục bộ: xem [Submission Fixes](SUBMISSION_FIXES_2026-10-19.md).
Các mục bên dưới là ảnh chụp kết quả audit trước khi sửa, không phải danh sách
khẳng định tất cả lỗi đó vẫn còn trong source hiện tại.

Ngày: 19/10/2026. Phạm vi: source local `develop`, frontend trong
`minizalo/zalo_mini_app/my-app`, đối chiếu một số điểm backend phục vụ app.
Không đánh giá thanh toán. Không thay đổi logic, database hay cấu hình triển khai.
Các đoạn code dưới đây là hướng sửa, không phải bản vá đã áp dụng.

Đây là audit tĩnh, không phải cam kết đã tìm được mọi lỗi. Chưa có kiểm thử native
Zalo trên iOS/Android trong lượt này; chưa kiểm tra được quyền, domain, privacy URL,
phiên bản nộp duyệt trong Mini App Center hoặc middleware tại hạ tầng vận hành.
Không dùng kết quả test trong báo cáo cũ để chứng nhận source hiện tại.

Kiểm tra bổ sung trong lượt này: chưa chạy được TypeScript. `npx.cmd tsc --noEmit`
không tìm được compiler local và thử truy cập registry; truy cập bị từ chối EACCES.
Không coi việc đó là lỗi biên dịch của dự án, cũng không báo typecheck thành công.

## 1. Nen tang, auth va edge cases

### 01. SDK auth co the giu man hinh ket noi vo han

`src/api/client.ts:203`, `src/pages/index.tsx:434` -> **Cao, lỗi thiếu bảo vệ**.
`getUserInfo`, `getPhoneNumber`, `getAccessToken` không có deadline. Timeout 30 giây
của HTTP không bao phủ SDK. Khi SDK không trả kết quả, cả kết nối và xem dịch vụ
đều bị disable. Từ chối quyền thông thường đã được catch; không kết luận rằng mọi
lần từ chối đều gây treo.

Hướng sửa: deadline toàn luồng, cho phép thoát sang guest, dùng generation ở tầng
auth để kết quả muộn không thể ghi lại session. Chỉ `Promise.race` là chưa đủ.

```tsx
const attempt = ++authGeneration.current;
try {
  await withDeadline(connect(attempt), 20000);
} finally {
  if (attempt === authGeneration.current) setConnecting(false);
}
// Trong connect, ngay trước khi ghi token:
if (attempt !== authGeneration.current) return;
session.set(token);
// Khi hủy hoặc timeout: tăng authGeneration và hủy HTTP nếu còn đang chạy.
```

### 02. Quyen profile tuy chon nhung van duoc hoi truoc so dien thoai

`src/api/client.ts:218` -> **Trung bình, rủi ro UX/xét duyệt**.
`getUserInfo({autoRequestPermission:true})` chạy trước quyền điện thoại ở mỗi lần
kết nối có consent. Từ chối profile không chặn điện thoại, nhưng quyền tùy chọn
đang nằm trên đường đăng nhập bắt buộc. Nên hỏi khi khách chọn nhập tên/ảnh từ Zalo.
[Zalo khuyến nghị xin quyền đúng ngữ cảnh](https://docs.zaloplatforms.com/docs/MA/intro/request-permission).

```ts
// Login: chỉ thực hiện quyền cần để xác minh số điện thoại.
const { token: phoneToken } = await getPhoneNumber();
// Nút nhập tên/ảnh từ Zalo trong hoàn thiện hồ sơ:
const { userInfo } = await getUserInfo({ autoRequestPermission: true });
```

### 03. Safe area khong co mot chu so huu thong nhat

`app-config.json`, `src/css/app.scss:6`, `src/css/academy.scss:2`,
`src/pages/index.tsx:989` -> **Cao, rủi ro cần đo native**.
Đã ẩn safe area đáy iOS nhưng bottom nav chung không tự cộng inset; một số màn
lại tự cộng inset riêng. Shell cộng top inset, header học viện còn cộng thêm.
Có nguy cơ chạm home indicator hoặc thừa khoảng trống tùy tab/thiết bị.
[Ý nghĩa cấu hình chính thức](https://docs.zaloplatforms.com/docs/MA/intro/getting-started/app-config).

```scss
/* Chọn shell làm chủ inset; bỏ phần cộng inset trùng ở từng tab. */
.app-bottom-nav { padding-bottom: env(safe-area-inset-bottom, 0px); }
.mini-app-shell { --nav-height: calc(64px + env(safe-area-inset-bottom, 0px)); }
.page-content { padding-bottom: var(--nav-height); }
```

Phải đồng bộ lại chiều cao/inset tất cả màn, không chỉ thêm CSS này rồi coi đã xong.
Kiểm tra cả bàn phím, xoay màn hình và Android gesture/3-button navigation.

### 04. Dark theme co the lam icon trang tren nen sang

`app-config.json`, `src/components/layout.tsx:15` -> **Trung bình, rủi ro native**.
App đi theo theme Zalo, cấu hình icon dark là trắng, nhưng phần lớn nền tùy biến
vẫn sáng. Status bar transparent làm tương phản không nhất quán. Cú pháp object
`textColor.light/dark` là hợp lệ, không phải lỗi schema.

```json
{ "textColor": { "light": "black", "dark": "black" } }
```

Đây là hướng giữ app light hiện tại; hoặc triển khai dark theme thực sự và đồng bộ
cả nền/status bar. Đối chiếu [cấu hình theme Zalo](https://docs.zaloplatforms.com/docs/MA/intro/getting-started/app-config).

### 05. Cac man noi bo khong co browser/native back stack

`src/components/layout.tsx:19`, `src/pages/index.tsx` -> **Trung bình, rủi ro cần test native**.
Router chỉ có `/`; chi tiết, tìm kiếm, học tập chuyển bằng state. Không thấy
history/popstate hoặc tích hợp Back cho stack này. Nút Back tự vẽ có thể hoạt động
nhưng Back hệ thống không được bảo đảm quay đúng màn trước.

```tsx
<Route path="/services/:id" element={<ServiceDetailRoute />} />
// Dùng API điều hướng của router hiện có, thay vì chỉ setViewingService(...).
```

Cần thiết kế quy tắc ưu tiên đóng modal, quay chi tiết, quay tab trước rồi mới thoát.

### 06. Chua tim thay entry chinh sach bao mat/dieu khoan trong UI

`src/components/GroupFProfile.tsx`, màn auth/onboarding -> **Trung bình, rủi ro hồ sơ duyệt**.
Tìm source chưa thấy đường dẫn chính sách/điều khoản cho việc lưu số điện thoại,
thông tin cá nhân và hồ sơ chăm sóc. Chưa biết Mini App Center đã khai báo hay chưa;
không đủ căn cứ khẳng định chắc chắn bị từ chối.

```tsx
<button onClick={() => openPolicy(verifiedPublicPrivacyUrl)}>
  Chính sách bảo mật
</button>
```

URL phải là nội dung thật: mục đích xử lý, thời gian lưu, đơn vị liên hệ và quy trình
yêu cầu xử lý dữ liệu. Đối chiếu với dữ liệu thực tế app đang thu thập.

## 2. React, mang va tinh nhat quan du lieu

### 07. Mo quiz A roi doi sang B: response A van duoc ap dung

`src/components/GroupEAcademy.tsx:199`, `:424` -> **Trung bình, lỗi race xác nhận từ code**.
Scope chỉ gồm course/enrollment, không có quizId. Selector chỉ disable khi nộp,
không disable lúc mở bài. Response A có thể tạo một lượt thi không mong muốn và
ghi attempt/answers trong lúc UI đang chọn B.

```tsx
<select disabled={quizSubmitting || attemptBusy} /* ... */ />
// Bổ sung quizId và request generation vào scope được kiểm tra sau await:
const request = ++quizRequest.current;
const requestedQuizId = study.quiz.id;
const result = await apiClient.startQuiz(study.id, requestedQuizId, activeEnrollmentId);
if (request !== quizRequest.current || selectedQuizRef.current !== requestedQuizId) return;
```

### 08. Dieu huong tim kiem bi chan boi ghi lich su

`src/components/GroupBSearch.tsx:129`, `:152` -> **Trung bình, lỗi phụ thuộc mạng**.
Click mục hoặc kết quả phải `await commit(...)` trước khi điều hướng. Ghi lịch sử
chậm có thể giữ người dùng tới timeout dù dữ liệu kết quả đã có.

```ts
// Persistence chạy ở service có owner/session guard, không phụ thuộc modal còn mở.
void searchHistoryService.enqueue(userId, keyword).catch(reportHistoryFailure);
onNavigateCategory(category, keyword.trim());
```

Không chỉ bỏ `await` với queue hiện tại: cleanup modal đang hủy các việc chưa chạy
theo generation, có thể làm mất lịch sử.

### 09. Enter tim kiem lien tuc co the xep hang nhieu request trung

`src/components/GroupBSearch.tsx:69`, `:97`, `:120` -> **Trung bình, chống spam chưa đủ**.
`lastSaved` chỉ cập nhật sau response. Submit không bị khóa; queue giữ nhiều lần
ghi cùng từ khóa trước khi lần đầu hoàn thành. Serialize không đồng nghĩa dedupe.

```ts
if (pendingQueries.current.has(key)) return;
pendingQueries.current.add(key);
try { await persist(query); }
finally { pendingQueries.current.delete(key); }
```

### 10. Loc lich trong bo response cu nhung khong huy network

`src/hooks/useDirectorySlots.ts:15` -> **Trung bình, hiệu năng mạng**.
Đã có `cancelled` nên không kết luận response cũ ghi đè UI. Tuy nhiên mỗi lần đổi
ngày/dịch vụ vẫn gọi đồng thời mọi chi nhánh; các request cũ tiếp tục chạy.

```ts
const controller = new AbortController();
void loadSlotsWithConcurrencyLimit(branchIds, 3, controller.signal);
return () => controller.abort();
```

Cần truyền `signal` xuyên `getSlots`/fetch. Nếu dùng request cache chung, chỉ hủy
request do consumer này sở hữu; không abort request đang được màn khác dùng chung.

### 11. Timeout preload anh khong dung tai anh

`src/api/preload-images.ts:26` -> **Trung bình, lỗi quản lý tài nguyên**.
Sau 15 giây chỉ resolve và xóa khỏi Set, không xóa `src` hoặc handler. Worker tải
ảnh tiếp theo trong khi ảnh cũ còn tải; giới hạn 3 không còn phản ánh network thật.
Set cũng không có giới hạn theo phiên/catalog.

```ts
const finish = (failed: boolean) => {
  clearTimeout(timer);
  photo.onload = photo.onerror = null;
  if (failed) { photo.src = ''; warmed.delete(url); }
  resolve();
};
const timer = window.setTimeout(() => finish(true), 15000);
```

Bổ sung AbortSignal, giới hạn cache và ưu tiên ảnh đang hiển thị. Gán src rỗng là
yêu cầu hủy best-effort của trình duyệt, không phải bảo đảm hoàn tác network đã gửi.

### 12. Preload rong dang chan publish catalog theo Promise.all

`src/pages/index.tsx:224`, `src/api/client.ts:131` -> **Trung bình, cold start**.
UI đợi toàn nhóm metadata/catalog trước khi set các danh sách. Một endpoint chậm
có thể trì hoãn dữ liệu đã tải xong. Private preload còn tải nhiều nhóm và toàn bộ
nội dung các khóa đủ điều kiện; concurrency có giới hạn nhưng tổng số không giới hạn.

```ts
void apiClient.getServices().then(applyServices);
void apiClient.getBranches().then(applyBranches);
void preloadNonCriticalData(); // không chặn dữ liệu cần cho màn đầu
```

Vẫn có thể prefetch toàn app theo yêu cầu sản phẩm, nhưng phân tầng ưu tiên,
giới hạn dữ liệu, giữ owner guard và không dùng cả nhóm làm điều kiện render.

### 13. Countdown lam render lai ca man hoc vien moi giay

`src/components/GroupEAcademy.tsx:194`, `:429` -> **Trung bình, hiệu năng khi nhiều câu hỏi**.
`secondsLeft` nằm cùng component lớn chứa danh sách câu hỏi/bài học. Mỗi tick
chạy lại render của toàn cây này. Cần profile với dữ liệu thật đủ lớn để đo tác động.

```tsx
const QuizTimer = React.memo(({ deadline }: { deadline: number }) => {
  const remaining = useRemainingTime(deadline);
  return <p role="timer">{formatDuration(remaining)}</p>;
});
```

Tách timer; phần quyết định hết hạn/nộp bài vẫn phải đúng ở controller và backend.
Không chỉ thêm useCallback hàng loạt khi không có component memo nhận callback đó.

### 14. Tim kiem dung lai toan catalog moi lan go phim

`src/components/GroupBSearch.tsx:107` -> **Trung bình, rủi ro tăng theo dữ liệu**.
Map cả bốn catalog, tạo closure và chuẩn hóa chuỗi mỗi render; toàn bộ kết quả được
render ngay. Chưa có bằng chứng lag với lượng dữ liệu nhỏ hiện tại.

```tsx
const index = useMemo(() => buildSearchIndex(services, courses, branches, doctors),
  [services, courses, branches, doctors]);
const deferredQuery = useDeferredValue(keyword);
const results = useMemo(() => filterIndex(index, deferredQuery, category),
  [index, deferredQuery, category]);
```

Phân trang/windowing khi danh sách lớn; không giấu kết quả chỉ bằng một slice cố định.

### 15. Tat ca man chinh import tinh, chua chia tai theo tab

`src/pages/index.tsx`, `vite.config.mts` -> **Trung bình, cold start**.
Booking, academy, profile và các màn chi tiết được import sẵn. Artifact hiện có
được đo trong audit: JS khoảng 608 KB, gzip 172 KB; CSS khoảng 211 KB, gzip 32 KB.
Đây không phải kết quả build mới và không phải khẳng định vượt giới hạn Zalo.

```tsx
const Academy = React.lazy(() => import('./AcademyRoute'));
<Suspense fallback={<SectionSkeleton />}><Academy /></Suspense>
```

Dùng wrapper default-export nếu component hiện tại là named export. Prefetch chunk
khi nhàn rỗi nếu muốn tab sẵn sàng; preload dữ liệu không bắt buộc thực thi mọi màn.

### 16. Chon anh dai dien co race va thieu bao loi decode

`src/components/GroupFProfile.tsx:169` -> **Trung bình, lỗi edge case**.
FileReader/Image không có request generation. Chọn hai ảnh nhanh có thể khiến ảnh
cũ decode xong sau rồi ghi đè ảnh mới. Không thấy handler lỗi đọc/decode trong luồng
này; giới hạn 8 MB không giới hạn kích thước pixel sau giải mã.

```ts
const generation = ++avatarGeneration.current;
image.onload = () => {
  if (generation !== avatarGeneration.current) return;
  updateAvatar(image);
};
reader.onerror = image.onerror = () => showToast('Không đọc được ảnh.');
```

Abort reader cũ/cleanup khi unmount; cân nhắc resize bằng decoder hỗ trợ và giới hạn
kích thước ảnh. Kiểm tra HEIC trên iOS, không mặc định mọi MIME image đều decode được.

### 17. Timer toast khong duoc thay the/cleanup

`src/components/GroupFProfile.tsx:115`, `:261` -> **Thấp, lỗi hiển thị có thể tái hiện**.
Toast thứ nhất có thể xóa toast thứ hai trước hạn; timeout còn tồn tại sau unmount.
Không coi callback hữu hạn này là bằng chứng leak bộ nhớ vô hạn hoặc warning React 18.

```tsx
clearTimeout(toastTimer.current);
toastTimer.current = window.setTimeout(() => setToastMessage(null), 2500);
useEffect(() => () => clearTimeout(toastTimer.current), []);
```

### 18. Chua co error boundary cho loi render

`src/app.ts`, `src/components/layout.tsx:15` -> **Trung bình, thiếu lớp phục hồi**.
SDK `getSystemInfo()` gọi ngay trong render; không có boundary quanh app/tab. Một
exception render hoặc payload không đúng giả định có thể làm trắng toàn cây React.
Không khẳng định SDK hiện đang throw trên máy thật.

```tsx
<AppErrorBoundary fallback={<RecoverableErrorScreen />}>
  <Layout />
</AppErrorBoundary>
```

Boundary không thay thế catch cho async/event handler; màn lỗi phải có thử lại và
không ghi token/thông tin cá nhân vào telemetry.

## 3. Cau hinh, dependencies va van hanh

### 19. Dependency latest khong khoa hop dong SDK

`package.json:30`, `:47` -> **Trung bình, rủi ro tái lập build**.
`zmp-sdk`, `zmp-ui`, `zmp-vite-plugin` dùng latest. `npm ci` với lockfile giữ nguyên
vẫn có tính tái lập; rủi ro xảy ra khi update/tạo lại lockfile làm đổi SDK ngoài ý muốn.

```json
{
  "zmp-sdk": "2.53.0",
  "zmp-ui": "1.11.14",
  "zmp-vite-plugin": "1.1.6"
}
```

Đó là phiên bản từ lockfile được đọc trong audit, không phải khuyến nghị phiên bản
mới nhất. Chỉ cập nhật sau regression/native test. Chưa chạy kiểm tra CVE online nên
không kết luận dependency sạch lỗ hổng. Không thấy import jotai trong src, nhưng
package không dùng không tự động đồng nghĩa nó đang nằm trong bundle.

### 20. Browserslist cu khong tu dong tao polyfill/legacy bundle

`package.json:8`, `vite.config.mts`, `src/css/app.scss:7` -> **Trung bình, cấu hình gây hiểu nhầm**.
Khai iOS 9.3/Chrome 49 trong khi dùng 100dvh, AbortController và các API hiện đại;
Vite config không có chiến lược legacy/polyfill tương ứng. Browserslist không tự
bảo đảm JS runtime chạy trên các phiên bản này.

```scss
.mini-app-shell {
  height: calc(100vh - var(--app-safe-top));
  height: calc(100dvh - var(--app-safe-top));
}
```

Xác định minimum Zalo/WebView thực sự hỗ trợ, đồng bộ build target và polyfill theo
ma trận đó. Không thêm nguyên bộ polyfill nặng chỉ để giữ declaration cũ.

### 21. Backend auth chua thay rate limit trong app

`minizalo/backend/src/server.ts:199`, `:221` -> **Trung bình, rủi ro abuse/vận hành**.
`/api/auth/zalo` public đi tới provider/relay, không thấy limiter trong Express app.
Nút frontend disable không chống được client tự gọi API. Chưa kiểm chứng reverse
proxy/WAF có rate limit hay chưa. `cors()` mở không tự nó là bypass JWT.

```ts
app.post('/api/auth/zalo', authRateLimiter, route(authenticate));
```

Limiter phải chạy trước provider, kết hợp IP và identity tin cậy, trả 429/Retry-After;
nếu nhiều replica dùng shared store. Cấu hình trust proxy đúng hạ tầng, không tin
X-Forwarded-For tùy ý. Các write endpoint cũng cần quota phù hợp theo user.

## Khong ket luan nham la loi

- app-config hiện không có trường permissions không chứng minh khai báo sai.
  Phải đối chiếu API thực gọi với quyền được duyệt tại Mini App Center: điện thoại,
  profile nếu còn dùng, nativeStorage và những API native khác phát hiện khi test.
  [Hướng dẫn quyền chính thức](https://docs.zaloplatforms.com/docs/MA/intro/request-permission).
- textColor dạng object là hợp lệ. statusBar transparent và actionBarHidden cũng
  hợp lệ; vấn đề nằm ở việc tự xử lý inset/contrast/back sau khi dùng chúng.
- useCarousel đã clear timeout và tháo visibility listener; polling thông báo đã
  clear interval/tháo listener. Không báo lại các điểm đó là memory leak.
- useDirectorySlots đã chặn response cũ ghi UI. HTTP wrapper đã có timeout,
  xử lý 401 và reset session. Điều này không bao phủ timeout SDK native.
- Không đưa thanh toán chưa làm vào danh sách lỗi theo yêu cầu.

## Cac cua chan nop duyet can kiem tra tiep

1. Quyền điện thoại/profile/nativeStorage, domain API/media và privacy URL của đúng
   phiên bản nộp duyệt: chưa truy cập được Mini App Center để xác nhận.
2. Native iOS/Android: từ chối quyền, thu hồi quyền, SDK timeout, đổi tài khoản,
   mất mạng rồi trở lại, 401 giữa tác vụ, Back hệ thống, bàn phím và safe area.
3. Dữ liệu vận hành: báo cáo readiness trước đó ghi 0 mapping kỹ thuật viên-dịch vụ,
   0 slot hợp lệ tương lai, 0 bài học/câu hỏi/lịch lớp. Đây là số liệu của lần kiểm
   tra trước, không phải truy vấn mới trong lượt audit này. Cần chạy lại read-only
   và cấu hình dữ liệu thật trước khi coi booking/học tập sẵn sàng nghiệm thu.
4. Scheduler trong `backend/src/reminders.ts` chỉ chạy khi process hoạt động. Không
   có cơ chế đánh thức/delivery push native trong scheduler này. Cần job độc lập
   nếu hạ tầng có thể sleep; inbox DB không đồng nghĩa push tới máy khi app đóng.
5. Source audit là local dirty worktree, develop đang sau origin/develop 39 commit
   theo git status tại thời điểm kiểm tra. Không tự pull/rebase/push để tránh đè
   công việc. Cần đối chiếu commit thực tế trên Render và bản Testing trước nộp.

Kết luận: chưa đủ cơ sở xác nhận sẵn sàng nộp duyệt. Ưu tiên auth deadline, safe
area/native Back, quiz race, điều hướng tìm kiếm và đối chiếu quyền/dữ liệu triển khai.
