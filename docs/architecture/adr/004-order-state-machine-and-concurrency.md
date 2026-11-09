# ADR-004: Quản lý Vòng đời Đơn hàng bằng State Machine và Kiểm soát Tồn kho bằng Optimistic Locking

- **Trạng thái (Status):** Đã chấp thuận (Accepted)
- **Ngày (Date):** 2026-10-22

## 1. Bối cảnh (Context)
Một đơn hàng trong BrewLite trải qua nhiều giai đoạn từ lúc khởi tạo, thanh toán, pha chế tại quầy cho tới khi hoàn tất hoặc bị hủy. Nếu cho phép cập nhật cột `status` một cách tự do từ bất kỳ API nào, hệ thống có thể rơi vào các trạng thái phi lý (ví dụ: thanh toán lại cho đơn hàng đã `PAID` hoặc `COMPLETED`, hay chuyển đơn đã `CANCELLED` sang `PREPARING`). Đồng thời, khi nhiều khách hàng cùng đặt mua một món đồ uống chỉ còn số lượng ít, hệ thống cần tránh tình trạng bán âm kho (Race Condition).

## 2. Các phương án đã cân nhắc (Considered Options)
1. **Cập nhật trực tiếp trường `status` và trừ `stock` đơn thuần bằng câu lệnh `UPDATE`** mà không kiểm tra trạng thái hiện tại hay phiên bản bản ghi.
2. **Xây dựng lớp `OrderStateMachine` kiểm soát chuyển trạng thái hợp lệ kết hợp cơ chế Khóa lạc quan (Optimistic Locking) qua trường `Product.version`**.

## 3. Quyết định & Lý do (Decision & Rationale)
Nhóm quyết định chọn **Phương án 2: Sử dụng `OrderStateMachine` và Optimistic Locking**.

**Lý do:**
- **Bảo vệ vòng đời đơn hàng nghiêm ngặt (`OrderStateMachine`):**
  - Định nghĩa bảng chuyển trạng thái hợp lệ duy nhất:
    - Luồng chính: `PENDING` ➔ `PAID` ➔ `PREPARING` ➔ `READY` ➔ `COMPLETED`.
    - Luồng ngoại lệ thanh toán lỗi: `PENDING` ➔ `PAYMENT_FAILED` (cho phép thử thanh toán lại để chuyển sang `PAID` hoặc hủy sang `CANCELLED`).
    - Trạng thái kết thúc (`COMPLETED`, `CANCELLED`) không thể chuyển sang bất kỳ trạng thái nào khác.
  - Mọi yêu cầu chuyển trạng thái trái quy tắc (như cố tình thanh toán cho đơn đã `PAID`) đều bị chặn lại và ném ngoại lệ `BadRequestException`.
- **Chống bán vượt tồn kho với Optimistic Locking:**
  - Khi trừ tồn kho trong `OrdersService`, câu lệnh cập nhật kiểm tra đồng thời `id`, `version` hiện tại và điều kiện `stock >= qty`, sau đó tăng `version` thêm 1. Nếu có giao dịch khác vừa thay đổi bản ghi đó, giao dịch hiện tại sẽ phát hiện xung đột ngay lập tức và rollback an toàn.

## 4. Hệ quả & Đánh đổi (Consequences & Trade-offs)
- **Tích cực:** Vòng đời đơn hàng luôn nhất quán 100% giữa tài liệu SRS, sơ đồ thiết kế và mã nguồn; dễ dàng kiểm chứng bằng bộ Unit Test (`order-state-machine.spec.ts` và `optimistic-locking.spec.ts`).
- **Đánh đổi:** Khi xảy ra xung đột đồng thời ở thời điểm tải cao, yêu cầu đến sau sẽ nhận thông báo lỗi xung đột để người dùng xác nhận lại thay vì bị treo chờ khóa (Pessimistic Lock).
