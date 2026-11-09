# ADR-001: Tổ chức kho mã nguồn Monorepo và Kiến trúc Phân lớp theo Module

- **Trạng thái (Status):** Đã chấp thuận (Accepted)
- **Ngày (Date):** 2026-10-15

## 1. Bối cảnh (Context)
Dự án **BrewLite** bao gồm ứng dụng Frontend (`Next.js`), ứng dụng Backend API (`NestJS`), lược đồ cơ sở dữ liệu (`PostgreSQL / Prisma`), tài liệu thiết kế (`docs/`) và quy trình kiểm thử tự động CI/CD. Nhóm cần quyết định cách tổ chức kho mã nguồn (Repository) cũng như phong cách kiến trúc bên trong Backend để đảm bảo tốc độ phát triển qua 2 Sprint, dễ kiểm thử và thuận tiện khi triển khai.

## 2. Các phương án đã cân nhắc (Considered Options)
1. **Polyrepo (Tách nhiều kho mã nguồn):** Tách riêng repo `brewlite-web` và `brewlite-api`.
2. **Microservices:** Tách mỗi miền nghiệp vụ (Auth, Products, Orders, Payments) thành một dịch vụ độc lập có cơ sở dữ liệu riêng.
3. **Monorepo kết hợp Modular Layered Architecture (Kiến trúc Phân lớp theo Module):** Đặt cả `apps/web`, `apps/api` và `docs/` trong một kho mã nguồn duy nhất; bên trong `apps/api` tổ chức theo các NestJS Module độc lập, mỗi module phân tách rõ 3 tầng: `Controller` ➔ `Service / Strategy` ➔ `PrismaService`.

## 3. Quyết định & Lý do (Decision & Rationale)
Nhóm quyết định chọn **Phương án 3: Monorepo kết hợp Modular Layered Architecture**.

**Lý do:**
- **Đồng bộ hóa thay đổi End-to-End:** Một tính năng (như Đặt hàng hoặc Khuyến mãi) có thể được cập nhật đồng thời từ Database Schema, API Backend, Giao diện Frontend cho tới Ma trận truy vết (`docs/traceability-matrix.md`) chỉ trong một Pull Request duy nhất.
- **Đơn giản hóa CI/CD và Docker:** Chỉ cần một tệp `docker-compose.yml` và một pipeline GitHub Actions (`.github/workflows/ci.yml`) để kiểm tra Lint, Unit Test, Build cho toàn bộ hệ thống.
- **Ranh giới phân lớp rõ ràng (Separation of Concerns):** Tầng `Controller` chỉ nhận HTTP Request và kiểm tra DTO; tầng `Service` chứa toàn bộ quy tắc nghiệp vụ; tầng `PrismaService` đảm nhận giao tiếp cơ sở dữ liệu.

## 4. Hệ quả & Đánh đổi (Consequences & Trade-offs)
- **Tích cực:** Khởi chạy toàn bộ dự án dễ dàng bằng các lệnh npm tại thư mục gốc (`npm run dev:api`, `npm run dev:web`, `npm run test`); không phát sinh lỗi lệch phiên bản API giữa Frontend và Backend.
- **Đánh đổi:** Kho mã nguồn chứa cả hai ứng dụng nên thời gian chạy CI sẽ kiểm tra cả hai phần nếu không cấu hình bộ nhớ đệm (cache); các module trong Backend chia sẻ chung một tiến trình runtime.
