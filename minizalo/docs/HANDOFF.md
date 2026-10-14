# MLD - Bo ban giao dong bo v1

Tai lieu nay la diem bat dau bat buoc cho dev Zalo Mini App, Flutter Android/iOS,
Web Admin va Backend. Khi code mau thuan voi tai lieu, khong tu sua contract: tao PR
cap nhat contract truoc, sau do moi sua cac client.

## 1. Mot he thong dung chung

- Mot Backend API: Express + TypeScript trong `backend/`.
- Mot PostgreSQL/Supabase dung chung cho moi client.
- Mot Web Admin: React trong `admin_web/`. Khong dua Admin vao Mini App.
- Ba client: Zalo Mini App, Flutter Android/iOS va Web Admin.
- Moi ban ghi nghiep vu dung ID do Backend sinh. Khong noi du lieu bang ten, email
  hoac so dien thoai neu chua xac minh.

## 2. Thu tu doc

1. `docs/ARCHITECTURE.md`
2. `docs/API_CONTRACT.md`
3. `docs/BUSINESS_RULES.md`
4. `docs/TEAM_WORKFLOW.md`
5. `docs/CURRENT_GAPS.md`

## 3. Chay local

Backend:

```bash
cd backend
npm install
npm run db:generate
npm run db:deploy
npm run dev
```

Admin:

```bash
cd admin_web
copy .env.example .env.local
npm install
npm run dev
```

Mini App:

```bash
cd zalo_mini_app/my-app
copy .env.example .env
npm install
npm run dev
```

Flutter:

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5001/api
```

`10.0.2.2` dung cho Android emulator. iOS simulator/web dung
`http://localhost:5001/api`. Thiet bi that dung IP LAN cua may dev.

## 4. Definition of Done dung chung

Mot tinh nang chi duoc danh dau hoan thanh khi:

- UI co loading, empty, error va retry state.
- Doc/ghi qua API, khong con du lieu gia trong luong nghiep vu.
- Backend xac thuc, phan quyen va validate du lieu.
- Refresh app van giu dung du lieu da luu.
- Cac client hien thi cung trang thai va enum.
- Co test API cho happy path, validation va conflict.
- Migration da commit; khong sua truc tiep bang production.
- Khong commit `.env`, token, mat khau hoac DATABASE_URL.

## 5. Nguoi so huu phan viec

| Khu vuc | Quyen sua chinh | Bat buoc review |
|---|---|---|
| Prisma, migration, API | Backend owner | It nhat 1 dev client |
| Zalo SDK va Mini App | Zalo owner | Backend owner |
| Flutter Android/iOS | Flutter owner | Backend owner |
| Admin va RBAC | Admin owner | Backend owner |
| Contract, enum, business rule | Ca nhom | Backend owner chap thuan |

