# ADR-003: Áp dụng Strategy Pattern và Cơ chế Idempotency cho Dịch vụ Thanh toán

- **Trạng thái (Status):** Đã chấp thuận (Accepted)
- **Ngày (Date):** 2026-10-20

## 1. Bối cảnh (Context)
BrewLite yêu cầu hỗ trợ thanh toán không tiền mặt qua ít nhất hai phương thức: **Ví điện tử (`WALLET`)** và **Thẻ ngân hàng (`CARD`)**, đồng thời phải có khả năng chạy mô phỏng (Mock) phục vụ kiểm thử tự động cũng như kết nối cổng Sandbox thực tế (ZaloPay Sandbox QR và VNPAY Sandbox NCB). Ngoài ra, trong môi trường di động, người dùng rất dễ bấm đúp nút "Thanh toán" hoặc gửi lại request khi mạng chập chờn, gây nguy cơ trừ tiền hai lần cho cùng một đơn hàng.

## 2. Các phương án đã cân nhắc (Considered Options)
1. **Sử dụng câu lệnh điều kiện (`if-else` / `switch-case`) trực tiếp trong `PaymentsService`** và không kiểm tra khóa trùng lặp.
2. **Áp dụng mẫu thiết kế hướng đối tượng Strategy Pattern kết hợp khóa bất biến `idempotencyKey`**.

## 3. Quyết định & Lý do (Decision & Rationale)
Nhóm quyết định chọn **Phương án 2: Áp dụng Strategy Pattern (`PaymentStrategy`) và kiểm tra `idempotencyKey` bắt buộc**.

**Lý do:**
- **Tuân thủ nguyên lý Đa hình (Polymorphism) và Open/Closed Principle (OCP):**
  - Định nghĩa lớp trừu tượng `PaymentStrategy` với phương thức `.charge(amount, mockSuccess, context)`.
  - `WalletPaymentStrategy` đóng gói thuật toán thanh toán Ví điện tử (hỗ trợ cả Mock in-memory và ZaloPay Sandbox v2 qua `HMAC-SHA256`).
  - `CardPaymentStrategy` đóng gói thuật toán thanh toán Thẻ ngân hàng (hỗ trợ cả Mock in-memory và VNPAY Sandbox NCB qua `HMAC-SHA512`).
  - Khi cần bổ sung cổng thanh toán mới trong tương lai, nhóm chỉ cần thêm một lớp Strategy mới mà không phải sửa đổi logic cốt lõi của `PaymentsService`.
- **Chống trừ tiền trùng lặp bằng `idempotencyKey`:**
  - Mỗi yêu cầu `POST /payments` bắt buộc gửi kèm một chuỗi định danh duy nhất `idempotencyKey` (ràng buộc `@unique` trong bảng `Payment`).
  - Nếu hệ thống nhận được request có `idempotencyKey` đã tồn tại, `PaymentsService` trả về ngay kết quả giao dịch trước đó (`isIdempotent: true`) mà không thực hiện trừ tiền lần thứ hai.

## 4. Hệ quả & Đánh đổi (Consequences & Trade-offs)
- **Tích cực:** Đảm bảo an toàn tuyệt đối cho giao dịch thanh toán; dễ dàng kiểm thử cả kịch bản thành công (`PAID`) lẫn thất bại (`PAYMENT_FAILED` giữ nguyên giỏ hàng).
- **Đánh đổi:** Phía Client (`/checkout`) phải quản lý việc sinh mã `idempotencyKey` cho mỗi lần nhấn thanh toán hoặc thử lại thanh toán; phát sinh thêm một truy vấn kiểm tra khóa trong cơ sở dữ liệu trước khi gọi cổng thanh toán.
