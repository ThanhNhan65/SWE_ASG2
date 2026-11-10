# ADR-004: Quản lý Vòng đời Đơn hàng bằng OrderStateMachine và Kiểm soát Tồn kho Nguyên liệu

- **Trạng thái (Status):** Đã chấp thuận (Accepted)
- **Ngày (Date):** 2026-10-22

## 1. Bối cảnh (Context)
Một đơn hàng trong BrewLite trải qua nhiều giai đoạn từ lúc khởi tạo, thanh toán, pha chế tại quầy cho tới khi hoàn tất hoặc bị hủy. Nếu cho phép cập nhật cột `status` một cách tự do từ bất kỳ API nào, hệ thống có thể rơi vào các trạng thái phi lý (ví dụ: thanh toán lại cho đơn hàng đã `PAID` hoặc `COMPLETED`, hay chuyển đơn đã `CANCELLED` sang `PREPARING`). Đồng thời, hệ thống cần kiểm soát chặt chẽ định mức tồn kho nguyên liệu pha chế (Cà phê, Trà, Sữa, Đường, Đá) và Topping khi đặt đơn, thanh toán và khi hủy đơn.

## 2. Các phương án đã cân nhắc (Considered Options)
1. **Cập nhật trực tiếp trường `status` và trừ tồn kho đơn giản mà không kiểm tra trạng thái hợp lệ hay hoàn trả tồn kho khi hủy đơn.**
2. **Đóng gói quy tắc chuyển trạng thái đơn hàng trong `OrderStateMachine` tại tầng `L2 - Business Logic Layer` (`OrdersService`) kết hợp cơ chế kiểm tra, khấu trừ và hoàn trả tồn kho nguyên liệu/topping tự động.**

## 3. Quyết định & Lý do (Decision & Rationale)
Nhóm quyết định chọn **Phương án 2: Sử dụng `OrderStateMachine` trong `OrdersService` (`L2`) kết hợp quản lý định mức tồn kho nguyên liệu & topping**.

**Lý do:**
- **Bảo vệ vòng đời đơn hàng nghiêm ngặt (`OrderStateMachine`):**
  - Định nghĩa bảng chuyển trạng thái hợp lệ duy nhất cho `OrderStatus`:
    - Luồng chính: `PENDING` ➔ `PAID` ➔ `PREPARING` ➔ `READY` ➔ `COMPLETED`.
    - Luồng ngoại lệ thanh toán lỗi: `PENDING` ➔ `PAYMENT_FAILED` (cho phép khách hàng bấm thử lại thanh toán để chuyển sang `PAID` hoặc hủy đơn sang `CANCELLED`).
    - Trạng thái kết thúc (`COMPLETED`, `CANCELLED`) không thể chuyển sang bất kỳ trạng thái nào khác.
  - Mọi yêu cầu chuyển trạng thái trái quy tắc (như cố tình thanh toán cho đơn đã `PAID`) đều bị chặn lại và ném ngoại lệ `BadRequestException`.
- **Kiểm soát và hoàn trả tồn kho chính xác:**
  - Khi tạo đơn hàng (`OrdersService`) và xác nhận thanh toán thành công (`PaymentsService`), hệ thống tính toán định mức tiêu hao nguyên liệu (`SUGAR`, `ICE`, `COFFEE_BEANS`, `TEA_LEAVES`, `MILK`) theo kích cỡ ly (`S`, `M`, `L`) và mức đường/đá khách chọn, đồng thời khấu trừ số lượng `Topping`.
  - Nếu đơn hàng ở trạng thái `PAID` bị hủy sang `CANCELLED`, `OrdersService` tự động hoàn trả lại đúng số lượng nguyên liệu và topping vào kho (có đánh dấu chống hoàn trả trùng lặp).

## 4. Hệ quả & Đánh đổi (Consequences & Trade-offs)
- **Tích cực:** Vòng đời đơn hàng và số liệu tồn kho nguyên liệu luôn nhất quán 100% giữa tài liệu SRS, sơ đồ kiến trúc phân lớp và mã nguồn; dễ dàng kiểm chứng bằng bộ Unit Test.
- **Đánh đổi:** Tầng `L2 - Business Logic Layer` cần duy trì bảng công thức định mức nguyên liệu theo từng loại đồ uống và kích cỡ ly để tính toán lượng tiêu hao chính xác trước khi gọi xuống `PrismaService` (`L3`).
