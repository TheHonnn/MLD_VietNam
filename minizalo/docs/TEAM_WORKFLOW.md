# Cach ba dev lam chung

## Nhanh va PR

- `main`: ban staging on dinh, khong push thang.
- Moi viec dung nhanh `feat/<platform>-<ticket>` hoac `fix/<platform>-<ticket>`.
- Pull/rebase `main` truoc khi mo PR.
- PR thay schema/API phai duoc Backend owner review.
- Khong gom refactor khong lien quan vao PR tinh nang.

## Khi thay API

1. Sua `docs/API_CONTRACT.md` va mo ta migration.
2. Tao Prisma migration, khong dung `db push` cho staging/production.
3. Sua Backend va test API.
4. Sua adapter cua Zalo, Flutter, Admin.
5. Deploy Backend staging truoc, sau do client staging.
6. Smoke test bang cung mot tai khoan test va mot branch test.

## Du lieu test chung

- Tai khoan co dinh: customer, student, specialist, branch staff, admin.
- ID seed on dinh cho branch/service/course; khong hardcode user production.
- Dev khong sua seed chung de phuc vu rieng mot man hinh ma khong bao nhom.
- Moi bug ghi ro environment, user ID, request ID, endpoint va thoi gian.

## Checklist tich hop moi PR

- Khong co secret trong diff.
- Khong con mock/fallback o luong vua tich hop.
- Status/error code dung contract.
- Mutation thu lai khong tao ban ghi trung (idempotent neu can).
- Hai request dat cung slot: chi mot request thanh cong.
- User A khong doc/sua du lieu cua User B.
- Branch staff chi thay branch duoc gan; Admin moi thay toan he thong.
- Refresh/relaunch client van hien thi du lieu moi.

## Release

- Backend migration -> Backend API -> Admin -> mobile/mini app.
- API moi phai backward-compatible trong it nhat mot chu ky mobile release.
- Moi release co tag, changelog, migration ID va ke hoach rollback.
- Zalo Mini App chi submit version sau khi staging da pass; Android/iOS cung dung
  cung backend version da kiem thu.

