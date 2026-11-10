# Tài liệu Kiến trúc Hệ thống BrewLite (Task 3.1 — Phương pháp và Quyết định Kiến trúc)

## 1. Tổng quan Phong cách Kiến trúc
Hệ thống **BrewLite** được thiết kế theo mô hình **Monorepo** kết hợp **Kiến trúc Phân lớp 3 tầng theo Module (3-Tier Modular Layered Architecture)**. Mọi yêu cầu đi theo luồng một chiều rõ ràng từ giao diện người dùng xuống cơ sở dữ liệu và các cổng thanh toán bên ngoài:
- **Frontend (`apps/web - Next.js (PWA)`):** Phân tách thành 3 tầng: `UI Layer` ➔ `State & Logic Layer` ➔ `Data Access Layer`.
- **Backend (`apps/api - NestJS`):** Tổ chức theo các miền nghiệp vụ độc lập (`Auth`, `Products`, `Orders`, `Payments`, `Promotions`), bên trong mỗi module tuân thủ nghiêm ngặt 3 tầng: `L1 - Presentation Layer` ➔ `L2 - Business Logic Layer` ➔ `L3 - Data Access & Integration Layer`.

Thiết kế này giúp phân tách rõ trách nhiệm (Separation of Concerns), tránh phức tạp dư thừa (Over-engineering), dễ dàng kiểm thử đơn vị (Unit Test) và khớp 100% với cấu trúc thư mục thực tế của mã nguồn.

---

## 2. Mô tả Chi tiết các Thành phần Kiến trúc

### 2.1. Ứng dụng Frontend Next.js / PWA (`apps/web`)
Được thiết kế theo hướng **Mobile-First** phục vụ khách hàng đặt đồ uống nhanh trên điện thoại và chia thành **3 lớp**:
1. **UI Layer (`[Pages / Components]`):**
   - Xây dựng bằng **Next.js App Router** và **Tailwind CSS**, hiển thị các màn hình thực đơn (`/menu`), chi tiết & tùy chỉnh món (`/products/[id]`), giỏ hàng (`/cart`), thanh toán (`/checkout`) và lịch sử đơn hàng (`/orders`).
   - Tích hợp tệp `public/manifest.json` để hỗ trợ trải nghiệm **Progressive Web App (PWA)**, cho phép cài đặt biểu tượng ứng dụng lên màn hình chính điện thoại (*Add to Home Screen*).
2. **State & Logic Layer (`[Hooks / Cart Store]`):**
   - Sử dụng custom hooks và **Zustand** (đồng bộ với `localStorage`) để quản lý trạng thái giỏ hàng, tính toán giá theo kích cỡ (`S`, `M`, `L`), mức đường/đá, topping theo thời gian thực.
   - Bảo toàn nguyên vẹn giỏ hàng khi giao dịch thanh toán thất bại (`PAYMENT_FAILED`) để khách hàng có thể bấm thử lại ngay mà không phải chọn lại món.
3. **Data Access Layer (`[API Client (fetch)]`):**
   - Đóng gói các lệnh gọi HTTP RESTful API kèm JWT Token (`Authorization: Bearer <token>`) và mã chống trùng lặp `idempotencyKey` gửi xuống tầng `L1 - Presentation Layer` của Backend.

### 2.2. Ứng dụng Backend NestJS theo Module / Miền (`apps/api`)
Backend được chia thành **3 tầng phân lớp chuẩn mực**:

1. **L1 - Presentation Layer (`[Controllers]`, `[JwtAuthGuard / ValidationPipe (DTO)]`):**
   - Tiếp nhận HTTP Request từ Frontend và các tín hiệu Return / IPN / Callback từ cổng thanh toán.
   - Kiểm tra xác thực người dùng qua `JwtAuthGuard` và kiểm tra tính hợp lệ dữ liệu đầu vào bằng `class-validator` thông qua các lớp DTO (`CreateOrderDto`, `CreatePaymentDto`, `ValidatePromoDto`...).
   - Tuyệt đối không chứa logic nghiệp vụ hay câu lệnh truy vấn cơ sở dữ liệu.

2. **L2 - Business Logic Layer (`Services`, `OrderStateMachine`, `PaymentStrategy`):**
   - Chứa toàn bộ quy tắc nghiệp vụ cốt lõi của các miền:
     - **`AuthService`:** Đăng ký, đăng nhập, băm mật khẩu (`bcrypt`) và cấp phát JWT.
     - **`ProductsService`:** Quản lý danh mục đồ uống, topping và định mức tồn kho nguyên liệu pha chế (`COFFEE_BEANS`, `TEA_LEAVES`, `MILK`, `SUGAR`, `ICE`).
     - **`OrdersService` & `OrderStateMachine`:** Tính toán tổng tiền đơn hàng, kiểm tra tồn kho nguyên liệu/topping và kiểm soát nghiêm ngặt vòng đời trạng thái đơn hàng:
       - Luồng chính: `PENDING` ➔ `PAID` ➔ `PREPARING` ➔ `READY` ➔ `COMPLETED`.
       - Luồng ngoại lệ: `PENDING` ➔ `PAYMENT_FAILED` (cho phép thử lại sang `PAID` hoặc hủy sang `CANCELLED`).
       - Tự động hoàn trả lại tồn kho nguyên liệu và topping khi đơn hàng đã thanh toán (`PAID`) bị hủy (`CANCELLED`).
     - **`PromotionsService & LoyaltyService`:** Kiểm tra mã khuyến mãi (giảm theo `%` hoặc số tiền cố định) và tính/cộng điểm thưởng thành viên (`loyaltyPoints`).
     - **`PaymentsService` & `interface PaymentStrategy`:** Điều phối thanh toán không tiền mặt theo mẫu thiết kế **Strategy Pattern** và kiểm tra khóa `idempotencyKey`.

3. **L3 - Data Access & Integration Layer (`[PrismaService (ORM)]`, `[Config / Logger / Health]`):**
   - **`PrismaService`:** Quản lý kết nối tới cơ sở dữ liệu `PostgreSQL`, thực thi các truy vấn SQL an toàn kiểu (Type-safe) và điều phối giao dịch nguyên tử (`this.prisma.$transaction`).
   - **`Config / Logger / Health`:** Quản lý biến môi trường, ghi nhận nhật ký hoạt động và cung cấp endpoint kiểm tra sức khỏe hệ thống.

### 2.3. Cơ sở dữ liệu Quan hệ PostgreSQL và Cơ chế Migration
- **Cơ sở dữ liệu (`PostgreSQL - brewlite_db`):** Lưu trữ các thực thể có quan hệ chặt chẽ: `User`, `Product`, `Topping`, `Ingredient`, `Order`, `OrderItem`, `Payment`, `Promotion`.
- **Cơ chế Migration & Seed:** Quản lý tập trung qua tệp `apps/api/prisma/schema.prisma`. Sử dụng lệnh `npm run db:push` (`prisma db push` / `prisma migrate`) để đồng bộ cấu trúc bảng và `npm run db:seed` (`prisma/seed.ts`) để khởi tạo dữ liệu mẫu chuẩn xác trên mọi môi trường (Local, Docker, CI).
- **Tính toàn vẹn giao dịch (ACID):** Mọi thao tác cập nhật liên quan đến nhiều bảng (tạo đơn + trừ điểm/khuyến mãi, hoặc lưu thanh toán + đổi trạng thái đơn sang `PAID` + cộng điểm thưởng) đều bọc trong `this.prisma.$transaction`.

### 2.4. Dịch vụ Thanh toán Giả lập & Sandbox (Strategy Pattern + Idempotency)
- **Áp dụng Đa hình (Polymorphism) với Strategy Pattern:**
  - Tại tầng `L2 - Business Logic Layer`, `PaymentsService` phụ thuộc vào giao diện trừu tượng `PaymentStrategy`.
  - Hai lớp thực thi cụ thể (`..|>`) gồm:
    - **`WalletPaymentStrategy`:** Xử lý thanh toán Ví điện tử (hỗ trợ cả chế độ giả lập Mock phục vụ kiểm thử tự động và kết nối HTTPS tới **ZaloPay Sandbox** qua chữ ký `HMAC-SHA256`).
    - **`CardPaymentStrategy`:** Xử lý thanh toán Thẻ ngân hàng (hỗ trợ cả chế độ giả lập Mock phục vụ kiểm thử tự động và kết nối HTTPS tới **VNPay Sandbox** qua chữ ký `HMAC-SHA512`).
- **Chống thanh toán trùng lặp (`idempotencyKey`):** Mỗi yêu cầu thanh toán bắt buộc đính kèm `idempotencyKey` (ràng buộc `@unique` trong bảng `Payment`). Nếu khách hàng bấm đúp hoặc mạng chập chờn gửi lại cùng một key, hệ thống trả về ngay kết quả giao dịch trước đó (`isIdempotent: true`) mà không trừ tiền lần thứ hai.

### 2.5. Ghi nhận Log, Kiểm tra Sức khỏe (Health Check) và Quản lý Cấu hình
- **Quản lý cấu hình (`Config`):** Mọi thông số nhạy cảm (`DATABASE_URL`, `JWT_SECRET`, khóa bí mật `VNPAY_*`, `ZALOPAY_*`, cổng chạy ứng dụng) được tách hoàn toàn khỏi mã nguồn thông qua tệp `.env` (kèm `.env.example` làm mẫu).
- **Ghi nhận Log (`Logger`):** Sử dụng cơ chế logging của NestJS để ghi lại lịch sử khởi tạo đơn, trạng thái giao dịch thanh toán, khấu trừ/hoàn trả tồn kho và các cảnh báo ngoại lệ.
- **Kiểm tra sức khỏe (`Health Check`):** Cung cấp endpoint kiểm tra trạng thái hoạt động của API và kết nối cơ sở dữ liệu, phục vụ giám sát container trong `docker-compose.yml` và pipeline CI/CD.

---

## 3. Lý do lựa chọn, Ưu điểm, Nhược điểm và Sự đánh đổi (Trade-offs)

| Quyết định kiến trúc | Lý do lựa chọn | Ưu điểm (Pros) | Nhược điểm (Cons) | Sự đánh đổi (Trade-offs) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Monorepo (`apps/web` + `apps/api`)** | Đồng bộ phát triển Full-stack trong nhóm qua 2 Sprint. | Chia sẻ chung cấu hình Docker, CI/CD; cập nhật tính năng từ DB ➔ API ➔ UI trong cùng 1 Pull Request. | Kho mã nguồn chứa cả 2 ứng dụng nên kích thước lớn hơn; CI phải kiểm tra cả 2 phần. | Chấp nhận cấu hình CI cho cả repo để đổi lấy tốc độ tích hợp nhanh và không bị lệch phiên bản API giữa Web và Backend. |
| **2. Kiến trúc Phân lớp 3 tầng (3-Tier Layered Architecture)** | Chuẩn mực mặc định của NestJS, trực quan, không gây phức tạp dư thừa (Over-engineering). | Phân tách rõ `Controller` (L1) ➔ `Service` (L2) ➔ `PrismaService` (L3); sơ đồ khớp 100% với cấu trúc code thực tế. | Tầng `Service` (L2) gọi trực tiếp `PrismaService` (L3) nên gắn kết với Prisma ORM. | Đánh đổi việc trừu tượng hóa ORM tuyệt đối (như trong Clean Architecture) để giảm số lượng file boilerplate, tăng tốc độ hoàn thành 2 Sprint. |
| **3. PostgreSQL + Prisma ORM (`$transaction`)** | Dữ liệu đơn hàng, tồn kho nguyên liệu và thanh toán đòi hỏi tính nhất quán tài chính cao. | Đảm bảo ACID tuyệt đối; TypeScript Type-safety 100%; chống SQL Injection; dễ dàng chạy Migration & Seed. | Phải chạy lại `prisma generate` mỗi khi sửa đổi `schema.prisma`. | Chấp nhận bước sinh mã của Prisma để đổi lấy sự an toàn kiểu dữ liệu ở thời điểm biên dịch và quản lý giao dịch nguyên tử dễ dàng. |
| **4. Strategy Pattern + `idempotencyKey` cho Thanh toán** | Hỗ trợ đồng thời Ví điện tử & Thẻ ngân hàng, vừa chạy được Unit Test (Mock) vừa chạy được Sandbox thật. | Tuân thủ SOLID (Open/Closed Principle); dễ thêm cổng thanh toán mới; chống trừ tiền 2 lần khi bấm đúp. | Client phải sinh và quản lý `idempotencyKey`; thêm 1 bước tra cứu DB trước khi thanh toán. | Chấp nhận thêm 1 truy vấn kiểm tra khóa `idempotencyKey` để đảm bảo an toàn tài chính tuyệt đối cho khách hàng. |
| **5. Next.js App Router (PWA) + Zustand** | Khách đặt đồ uống chủ yếu dùng điện thoại di động. | Giao diện Mobile-First mượt mà, cài được lên màn hình chính (PWA); giữ nguyên giỏ hàng khi thanh toán lỗi. | Cần kiểm soát kỹ ranh giới Server/Client Component (`'use client'`) và Hydration với `localStorage`. | Chấp nhận xử lý đồng bộ state phía Client để mang lại trải nghiệm đặt món nhanh và không làm mất giỏ hàng của khách. |

---

## 4. Danh mục các Bản ghi Quyết định Kiến trúc (ADRs)
Các quyết định kiến trúc trọng yếu của dự án được ghi lại chi tiết trong thư mục `docs/architecture/adr/`:
- [ADR-001: Tổ chức kho mã nguồn Monorepo và Kiến trúc Phân lớp 3 Tầng (L1–L3)](./adr/001-monorepo.md)
- [ADR-002: Sử dụng PostgreSQL kết hợp PrismaService (ORM) ở Tầng L3 và Giao dịch ACID](./adr/002-postgresql-and-prisma-orm.md)
- [ADR-003: Áp dụng Strategy Pattern (PaymentStrategy) và Cơ chế Idempotency cho Dịch vụ Thanh toán](./adr/003-payment-strategy-and-idempotency.md)
- [ADR-004: Quản lý Vòng đời Đơn hàng bằng OrderStateMachine và Kiểm soát Tồn kho Nguyên liệu](./adr/004-order-state-machine-and-concurrency.md)
- [ADR-005: Phân lớp Frontend Next.js (PWA) thành 3 Tầng (UI, State & Logic, Data Access)](./adr/005-nextjs-pwa-mobile-first.md)
