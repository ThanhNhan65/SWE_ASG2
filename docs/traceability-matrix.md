# Traceability Matrix

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test / Kiểm thử | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-01** | US-01 Xem thực đơn món | Activity-01, Class-01 | `GET /products` | `products.service.spec.ts`, `products.controller.spec.ts` (API-T01: Lấy danh sách, rỗng, lỗi) | **Done** |
| **FR-02** | US-02 Xem chi tiết sản phẩm | Activity-01, Class-01 | `GET /products/:id` | `products.service.spec.ts`, `products.controller.spec.ts` (API-T02: Chi tiết, 404, 400) | **Done** |
| **FR-03** | US-03 Giỏ hàng & Tùy chọn món | UseCase_TongQuan | `Cart`, `useCartStore` | Unit test & Component State | In Progress |
| **FR-04** | US-04 Quản lý trạng thái đơn | SequenceDiagram_DangNhapvaTaoDon | `orders.service.ts`, `OrderStateMachine` | `orders.service.spec.ts` | **Done** |
| **FR-05** | UC-01 Thanh toán đơn hàng | SequenceDiagram_ThanhtoanvaIdempotency | `payments.service.ts`, `POST /payments` | Unit test & Strategy test | In Progress |
