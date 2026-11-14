# Traceability Matrix

> **Dự án**: BrewLite — Hệ thống đặt đồ uống trực tuyến  
> **Tài liệu tham chiếu**: [Đặc tả Yêu cầu SRS](file:///c:/CODE/SWE/SWE_ASG2/docs/requirements/srs.md) | [Bối cảnh & Phạm vi](file:///c:/CODE/SWE/SWE_ASG2/docs/requirements/context-and-scope.md) | [Kiến trúc Hệ thống](file:///c:/CODE/SWE/SWE_ASG2/docs/architecture/overview.md)

| Mã yêu cầu | Tên yêu cầu / User Story | Thiết kế / Sơ đồ | Mã nguồn / API Thực thi | Kiểm thử / Test Case | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **FR-01** | Hiển thị menu sản phẩm | `UseCase_TongQuan`, `Activity-01`, `Class-01` | `GET /products`, `products.service.ts`, `products.controller.ts` | `products.service.spec.ts`, `products.controller.spec.ts` (API-T01: Lấy danh sách, rỗng, lỗi) | **Done** |
| **FR-02** | Xem chi tiết và tùy chọn sản phẩm | `UseCase_TongQuan`, `Activity-01`, `Class-01` | `GET /products/:id`, `products.service.ts`, `ProductOptionModal.tsx` | `products.service.spec.ts`, `products.controller.spec.ts` (API-T02: Chi tiết, 404, 400) | **Done** |
| **FR-03** | Quản lý giỏ hàng | `UseCase_TongQuan`, `SequenceDiagram_DangNhapvaTaoDon` | `apps/web/src/app/checkout/page.tsx`, `useCartStore` / LocalStorage | Component State & Giỏ hàng tính tổng tiền theo Size/Topping | **Done** |
| **FR-04** | Đăng ký và đăng nhập | `UseCase_TongQuan`, `SequenceDiagram_DangNhapvaTaoDon` | `POST /auth/register`, `POST /auth/login`, `auth.service.ts`, `jwt.strategy.ts` | `auth.service.ts`, Token validation & Password hashing (`bcrypt`) | **Done** |
| **FR-05** | Tạo đơn hàng | `UseCase_TongQuan`, `SequenceDiagram_DangNhapvaTaoDon` | `POST /orders`, `orders.service.ts`, `OrderStateMachine`, Transaction Prisma | `orders.service.spec.ts` (Task 5.4, trừ kho nguyên liệu & Optimistic locking) | **Done** |
| **FR-06** | Thanh toán không tiền mặt | `UseCase_TongQuan`, `SequenceDiagram_ThanhtoanvaIdempotency` | `POST /payments`, `payments.service.ts`, `wallet-payment.strategy.ts`, `card-payment.strategy.ts` | `discount-strategy.spec.ts`, Mock ZaloPay/VNPay Sandbox, Idempotency check | **Done** |
| **FR-07** | Xem và xác nhận lịch sử đơn hàng | `UseCase_TongQuan` | `GET /orders`, `GET /orders/:id`, `orders.service.ts`, `apps/web/src/app/orders/page.tsx` | Unit test query đơn theo User ID, bảo mật phân quyền đơn hàng | **Done** |

