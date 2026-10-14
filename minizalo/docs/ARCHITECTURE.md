# Kien truc MLD v1

## Bien he thong

```text
Zalo Mini App ----\
Flutter Android ----> HTTPS REST API ----> Prisma ----> PostgreSQL/Supabase
Flutter iOS -------/          |
Web Admin --------/           +----> Zalo/SMS/Payment adapters (bo sung sau)
```

Client khong truy cap PostgreSQL/Supabase truc tiep. Service role key chi duoc dat
tren Backend. Admin cung goi API, khong duoc bo qua RBAC bang cach doc DB truc tiep.

## Dinh danh va dang nhap

- Zalo: Mini App lay authorization code tu Zalo SDK, gui den
  `POST /api/auth/zalo`; Backend xac minh va tra access/refresh token cua MLD.
- Android/iOS: `send-otp` -> `verify-otp`; Backend tra token cua MLD.
- Admin: tai khoan nhan vien + mat khau/SSO va MFA khi dua production.
- Mot nguoi co the co nhieu identity. Can bang `AuthIdentity` voi
  `provider`, `providerSubject`, `userId`; unique theo provider + subject.
- Khong gop tai khoan tu dong chi vi trung ten/email. Lien ket tai khoan phai co
  xac minh cua ca hai identity.

## Moi truong

| Moi truong | Du lieu | Muc dich |
|---|---|---|
| local | Seed rieng | Dev ca nhan |
| staging | Du lieu test chung | QA, tich hop 3 client |
| production | Du lieu that | Nguoi dung/doanh nghiep |

Moi moi truong co database, URL va secrets rieng. Khong test tren production.
Production hien tai cua Backend la `https://mld-6knq.onrender.com`; can kiem tra
`GET /api/health` truoc khi gan vao client. Admin chua duoc coi la production neu
chua co URL rieng, dang nhap Admin va RBAC.

## Chuan du lieu

- ID la chuoi opaque; client khong suy dien y nghia tu ID.
- Thoi gian API la ISO-8601 UTC, vi du `2026-10-14T08:30:00.000Z`.
- Backend doi lich theo timezone `Asia/Ho_Chi_Minh`, luu thoi diem UTC.
- Tien la so nguyen VND hoac Prisma Decimal khong co phan le; khong dung float.
- Xoa du lieu nghiep vu theo soft delete/status; booking va giao dich khong hard delete.
- Moi mutation quan trong can `createdAt`, `updatedAt`, `createdBy` khi ap dung cho Admin.

