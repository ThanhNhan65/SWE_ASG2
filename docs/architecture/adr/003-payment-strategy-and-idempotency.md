# ADR-003: Áp dụng Strategy Pattern (PaymentStrategy) và Cơ chế Idempotency cho Dịch vụ Thanh toán

- **Trạng thái (Status):** Đã chấp thuận (Accepted)
- **Ngày (Date):** 2026-10-20

## 1. Bối cảnh (Context)
BrewLite yêu cầu hỗ trợ thanh toán không tiền mặt qua ít nhất hai phương thức: **Ví điện tử (`WALLET`)** và **Thẻ ngân hàng (`CARD`)**, đồng thời phải có khả năng chạy mô phỏng (Mock) phục vụ kiểm thử tự động cũng như kết nối tới đám mây `ZaloPay Sandbox (ví điện tử)` và `VNPay Sandbox (thẻ)` (kèm xử lý Return / IPN / Callback về `Controllers`). Ngoài ra, trong môi trường di động, người dùng rất dễ bấm đúp nút "Thanh toán" hoặc gửi lại request khi mạng chập chờn, gây nguy cơ trừ tiền hai lần cho cùng một đơn hàng.

## 2. Các phương án đã cân nhắc (Considered Options)
1. **Sử dụng câu lệnh điều kiện (`if-else` / `switch-case`) trực tiếp trong `PaymentsService`** để gọi thẳng SDK/HTTP của từng cổng thanh toán và không kiểm tra khóa trùng lặp.
2. **Áp dụng mẫu thiết kế hướng đối tượng Strategy Pattern (`interface PaymentStrategy`, `WalletPaymentStrategy`, `CardPaymentStrategy`) ngay trong tầng `L2 - Business Logic Layer` kết hợp khóa bất biến `idempotencyKey`**.

## 3. Quyết định & Lý do (Decision & Rationale)
Nhóm quyết định chọn **Phương án 2: Áp dụng Strategy Pattern (`PaymentStrategy`) và kiểm tra `idempotencyKey` bắt buộc**.

**Lý do:**
- **Tuân thủ nguyên lý Đa hình (Polymorphism) và Open/Closed Principle (OCP):**
  - Tại tầng `L2 - Business Logic Layer`, định nghĩa hợp đồng giao diện `interface PaymentStrategy` với phương thức `.charge(amount, mockSuccess, context)`.
  - `PaymentsService` gọi thông qua giao diện `PaymentStrategy` và hai lớp thực thi cụ thể (`..|>`):
    - **`[WalletPaymentStrategy]`:** Đóng gói thuật toán thanh toán Ví điện tử, hỗ trợ cả chế độ Mock in-memory và kết nối HTTPS tới `ZaloPay Sandbox (ví điện tử)` qua chữ ký `HMAC-SHA256`.
    - **`[CardPaymentStrategy]`:** Đóng gói thuật toán thanh toán Thẻ ngân hàng, hỗ trợ cả chế độ Mock in-memory và kết nối HTTPS tới `VNPay Sandbox (thẻ)` qua chữ ký `HMAC-SHA512`.
  - Khi cần bổ sung phương thức thanh toán mới (như MoMo, Apple Pay), nhóm chỉ cần thêm một lớp Strategy mới thực thi `PaymentStrategy` mà không phải sửa đổi vòng lặp xử lý cốt lõi của `PaymentsService`.
- **Chống trừ tiền trùng lặp bằng `idempotencyKey`:**
  - Mỗi yêu cầu `POST /payments` gửi từ `[API Client (fetch)]` lên `[Controllers]` bắt buộc kèm theo chuỗi định danh duy nhất `idempotencyKey` (ràng buộc `@unique` trong bảng `Payment`).
  - Nếu `PaymentsService` phát hiện `idempotencyKey` đã tồn tại qua `[PrismaService (ORM)]`, hệ thống trả về ngay kết quả giao dịch trước đó (`isIdempotent: true`) mà không thực hiện trừ tiền lần thứ hai.

## 4. Hệ quả & Đánh đổi (Consequences & Trade-offs)
- **Tích cực:** Đảm bảo an toàn tuyệt đối cho giao dịch thanh toán; thể hiện rõ tính Đa hình (Polymorphism) trong OOP; dễ dàng kiểm thử cả kịch bản thành công (`PAID`) lẫn thất bại (`PAYMENT_FAILED` giữ nguyên giỏ hàng).
- **Đánh đổi:** Phía Client (`apps/web`) phải quản lý việc sinh mã `idempotencyKey` cho mỗi lần nhấn thanh toán hoặc thử lại thanh toán; phát sinh thêm một truy vấn kiểm tra khóa tại `PrismaService` trước khi gọi cổng thanh toán.
