# Hướng dẫn Triển khai & Vận hành (Deployment Guide) — BrewLite

Tài liệu mô tả kiến trúc triển khai, quy trình container hóa Docker, tự động hóa CI/CD (GitHub Actions) và thông tin vận hành hệ thống **BrewLite** trên môi trường phát triển cục bộ (Local) cũng như Production (Cloud).

![Sơ đồ Triển khai Hệ thống BrewLite](./DeloymentDiagram.svg)

---

## 1. Triển khai Cục bộ bằng Docker Compose

Hệ thống được đóng gói đầy đủ 3 container qua [docker-compose.yml](../docker-compose.yml), [apps/api/Dockerfile](../apps/api/Dockerfile) và [apps/web/Dockerfile](../apps/web/Dockerfile):
- **`postgres`**: PostgreSQL 16 Alpine (`5432`), kèm volume `postgres_data` và healthcheck `pg_isready`.
- **`api`**: Backend NestJS (`3001`), tự động chạy `prisma db push`, `npm run db:seed` khi khởi động và bật healthcheck `GET /health`.
- **`web`**: Frontend Next.js (`3000`), build cùng `NEXT_PUBLIC_API_URL`.

### Yêu cầu tiên quyết
- Đã cài đặt **Docker** và **Docker Compose**.

### Các bước thực hiện
1. **Khởi tạo file biến môi trường:**
   ```bash
   cp .env.example .env
   ```
2. **Build và khởi chạy toàn bộ 3 services:**
   ```bash
   docker compose up --build -d
   ```
3. **Kiểm tra trạng thái container:**
   ```bash
   docker compose ps
   ```
4. **Truy cập ứng dụng local:**
   - **Frontend (Next.js PWA):** http://localhost:3000
   - **Backend API (NestJS):** http://localhost:3001
   - **Health Check API:** http://localhost:3001/health
   - **PostgreSQL:** `localhost:5432` (DB: `brewlite_db`, User: `brewlite_user`, Password: `brewlite_password`)
5. **Dừng và dọn dẹp container:**
   ```bash
   docker compose down
   ```

---

## 2. Chạy Trực tiếp trên Môi trường Phát triển (Local Monorepo)

1. **Cài đặt dependencies:**
   ```bash
   npm install
   npm --prefix apps/api install
   npm --prefix apps/web install
   ```
2. **Sinh Prisma Client, đồng bộ schema và nạp dữ liệu mẫu:**
   ```bash
   npm run prisma:generate
   npm run db:push
   npm run db:seed
   ```
3. **Chạy ứng dụng:**
   ```bash
   npm run dev:api    # Backend NestJS tại http://localhost:3001
   npm run dev:web    # Frontend Next.js tại http://localhost:3000
   ```
4. **Chạy kiểm tra chất lượng & kiểm thử tự động:**
   ```bash
   npm run lint       # Oxlint (apps/api) + TypeScript tsc --noEmit (apps/web)
   npm test           # 50 Unit Tests Backend (apps/api/src/**/*.spec.ts)
   npm run test:e2e   # 10 Integration & E2E Tests (tests/*.e2e-spec.ts)
   npm run build      # Build nest & next production bundle
   ```

---

## 3. Quy trình CI/CD (GitHub Actions)

Pipeline tự động được cấu hình tại [.github/workflows/ci.yml](../.github/workflows/ci.yml):

1. **CI Pipeline (`lint-test-build`)** — Chạy khi có `push` hoặc `pull_request` vào `main` / `develop`:
   - Khởi tạo **PostgreSQL 16 service container** phục vụ kiểm thử tích hợp/E2E.
   - **Bước 1 (Install):** Cài đặt packages ở root, `apps/api`, `apps/web` và sinh Prisma Client (`prisma generate`).
   - **Bước 2 (Lint):** Chạy `npm run lint`.
   - **Bước 3 (Unit & E2E Tests):** Chạy `npm --prefix apps/api run test` (Unit Tests), chạy `prisma db push`, và chạy `npm --prefix apps/api run test:e2e` (`tests/orders.e2e-spec.ts`, `tests/payments.e2e-spec.ts`).
   - **Bước 4 (Build):** Chạy `npm run build` cho cả Backend và Frontend.
2. **CD Pipeline (`deploy-production`)** — Chạy tự động khi code được merge vào `main` (`lint-test-build` pass):
   - Kích hoạt **Render Production Deploy Hook** thông qua GitHub Secret `RENDER_DEPLOY_HOOK_URL`.
   - Chạy **Production Smoke Test** kiểm tra phản hồi `GET https://swe-asg2.onrender.com/health` và `https://brewlite05.vercel.app`.
   - **Vercel** tự động build và deploy Frontend từ nhánh `main` thông qua tích hợp GitHub Repository.

---

## 4. Triển khai Thực tế (Cloud Production)

| Thành phần | Nền tảng | Địa chỉ / Cấu hình thực tế |
| :--- | :--- | :--- |
| **Frontend PWA (`apps/web`)** | **Vercel** | **URL:** https://brewlite05.vercel.app <br/> Root Directory: `apps/web` <br/> Env: `NEXT_PUBLIC_API_URL=https://swe-asg2.onrender.com` |
| **Backend API (`apps/api`)** | **Render** (Node.js Web Service) | **URL:** https://swe-asg2.onrender.com <br/> **Health Check:** https://swe-asg2.onrender.com/health <br/> Build: `npm install && npm run prisma:generate && npm run build` <br/> Start: `npm run start:prod` |
| **Database** | **Neon Serverless Postgres** | Database: `brewlite_db` (AWS Singapore `ap-southeast-1`, TLS/SSL Port `5432`, `sslmode=require`) <br/> Env: `DATABASE_URL` (Pooler) và `DATABASE_URL_UNPOOLED` (Direct Migrations) |
| **Payment Gateways (Sandbox)** | **ZaloPay & VNPay Sandbox** | Cấu hình callback redirect về `https://brewlite05.vercel.app/orders/zalopay-return` và `https://brewlite05.vercel.app/orders/vnpay-return` |

### Lưu ý bảo mật & vận hành
- Không commit file `.env` thật hoặc secret key lên Git (chỉ duy trì mẫu tại `.env.example`).
- Render gói Free có thể ngủ (sleep) sau 15 phút không có traffic; request đầu tiên tới `/health` mất khoảng 20–40 giây để cold-start.
