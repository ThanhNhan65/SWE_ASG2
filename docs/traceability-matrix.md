# Ma trận truy vết (Traceability Matrix) — BrewLite

Bảng ma trận truy vết (Requirements Traceability Matrix — RTM) thiết lập tính liên kết xuyên suốt từ yêu cầu người dùng (User Story từ Assignment 1), đặc tả yêu cầu kỹ thuật (Task 1), mô hình hóa thiết kế (Task 2 & 3), mã nguồn thực thi (Task 4 & 5) đến các bài kiểm thử tự động.

| Mã yêu cầu | User Story (ASG1) & Yêu cầu | Thiết kế / Sơ đồ (Task 2 & 3) | Mã nguồn / API (Task 4 & 5) | Mã Kiểm thử (Test Case) | Trạng thái |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **FR-01** | **US-07: Xem menu chi tiết sản phẩm** | • Use-case tổng quan (`uctongquan.drawio.png`)<br>• Class Diagram (`Product`, `Category`) | • `GET /products`, `GET /products/:id`<br>• Menu Component Next.js (`apps/web`)<br>• Seed Data `prisma/seed.ts` | **API-T01** | **Done** |
| **FR-02** | **US-02: Chi tiết sản phẩm (Size & Topping)** | • Class Diagram (`ProductSize`, `Topping`) | • `GET /products/:id`, `GET /toppings`<br>• `ProductDetailModal` (Next.js) | **API-T02** | **Done** |
| **FR-03** | **US-01: Quản lý giỏ hàng** | • Sơ đồ Activity: Giai đoạn 1 & 2 (`sequencethanhtoan.png`) | • `CartStore` (Zustand client-side store) | **UI-T01** | **Done** |
| **FR-04** | **US-03: Đăng ký và đăng nhập tài khoản** | • Sơ đồ Activity: Kiểm tra đăng nhập (`sequencethanhtoan.png`)<br>• Class Diagram (`User`, `Role`) | • `POST /auth/login`, `POST /auth/register`<br>• `JwtAuthGuard`, `AuthService` | **SEC-T01** | **Done** |
| **FR-05** | **US-05: Tạo đơn hàng** *(Thuộc UC-01)* | • Sequence Diagram 1: Khởi tạo đơn hàng (`sequence_dathang.png`)<br>• Class Diagram (`Order`, `OrderItem`)<br>• `ADR-002`: PostgreSQL & ACID Transaction | • `POST /orders`<br>• `OrdersService.createOrder()`<br>• `this.prisma.$transaction` | **INT-T01** | **Done** |
| **FR-06** | **US-04: Thanh toán không tiền mặt** *(Thuộc UC-01)* | • Sequence Diagram 2: Thanh toán đơn hàng (`Seq1.drawio.png`)<br>• Class Diagram (`Payment`, `PaymentMethod`)<br>• `ADR-003`: Strategy Pattern & Idempotency | • `POST /payments`<br>• `WalletPaymentStrategy`<br>• `CardPaymentStrategy` | **INT-T02** | **Done** |
| **FR-07** | **US-06: Xác nhận và xem lịch sử đơn hàng** | • Sequence Diagram 3: Hiển thị đơn hàng (`Se3.drawio.png`)<br>• Sơ đồ Activity: Giai đoạn 4 xử lý kết quả | • `GET /orders/me`<br>• `GET /orders/:orderCode`<br>• Giao diện `OrderSuccess`, `OrderHistory` | **API-T03** | **Done** |
| **FR-08** | **US-08: Quản lý & chuyển đổi trạng thái đơn** | • `ADR-004`: Order State Machine<br>• Sequence Diagram 3: Hiển thị đơn hàng | • `PATCH /orders/:orderCode/status`<br>• `order-state-machine.ts` | **UNIT-T02** | **Done** |
| **FR-09** | **US-09: Khuyến mãi & tích lũy điểm thưởng** | • Class Diagram (`Promotion`, `LoyaltyTransaction`) | • `POST /promotions/validate`<br>• `GET /promotions/loyalty/me` | **API-T04** | **Done** |
| **NFR-01** | **Thời gian phản hồi ($< 500$ms)** | • Sơ đồ Deployment (`uml.png`)<br>• Kiến trúc phân lớp L1-L3 | • Next.js Global CDN Caching<br>• Prisma Query Optimization | **PERF-01** | **Done** |
| **NFR-02** | **Bảo mật tài khoản & Giao dịch** | • `ADR-003`: Cơ chế Idempotency<br>• Sequence Diagram 2: Kiểm tra trùng lặp | • Băm mật khẩu bcrypt<br>• Ràng buộc `@unique` cột `idempotencyKey` | **SEC-T02** | **Done** |
| **NFR-03** | **Khả năng truy cập & Xử lý lỗi** | • `ADR-001`: Kiến trúc Monorepo & PWA | • Skeleton Loading (`loadding.png`)<br>• Error State & Retry button (`error.png`) | **UI-T02** | **Done** |
| **NFR-04** | **Cài đặt & Triển khai tự động** | • Sơ đồ Deployment (`uml.png`) | • `docker-compose.yml`<br>• Pipeline CI GitHub Actions (`ci.yml`) | **CI-T01** | **Done** |
