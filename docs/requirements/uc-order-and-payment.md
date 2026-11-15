# Đặc tả Use-case Trọng tâm — Task 1.3

## UC-01: Đặt và Thanh toán Đơn hàng

- **Tóm tắt:** Khách hàng lựa chọn sản phẩm, xác nhận giỏ hàng, tạo đơn hàng và tiến hành thanh toán không tiền mặt.
- **Sơ đồ tham chiếu:** [UseCase_DatvaThanhtoan.drawio.png](../diagrams/UseCase_DatvaThanhtoan.drawio.png)
- **Trigger:** Khách hàng nhấn nút **"Tiến hành thanh toán"** tại trang giỏ hàng sau khi đã lựa chọn sản phẩm.
- **Actor:**
  - **Actor chính:** Khách hàng (`Customer`)
  - **Actor phụ / Hệ thống ngoài:** Cổng thanh toán (`Payment Gateway` — VNPay / ZaloPay Sandbox)
- **Tiền điều kiện:**
  1. Khách hàng đã đăng nhập hợp lệ (có JWT Token còn hiệu lực).
  2. Giỏ hàng có ít nhất một sản phẩm.

---

## 1. Luồng chính (Main Flow)

1. Khách hàng mở giỏ hàng; hệ thống hiển thị danh sách sản phẩm đã chọn (kèm size, đường, đá, topping) và tổng tiền tạm tính.
2. Khách hàng bấm nút **"Tiến hành thanh toán"**; hệ thống chuyển sang trang xác nhận thanh toán (`/checkout`).
3. Khách hàng chọn phương thức thanh toán (**Ví điện tử ZaloPay** hoặc **Thẻ ngân hàng VNPay**), áp dụng mã giảm giá hoặc điểm thưởng (nếu có) và bấm nút thanh toán.
4. Hệ thống kiểm tra trạng thái đăng nhập, kiểm tra số lượng tồn kho sản phẩm và nguyên vật liệu; nếu đủ, hệ thống tạo đơn hàng trong `$transaction`, tạm giữ/trừ tồn kho và đặt trạng thái đơn hàng là `PENDING`.
5. Hệ thống gửi yêu cầu thanh toán đơn hàng (kèm `idempotencyKey`) tới cổng thanh toán qua `PaymentStrategy`.
6. Khách hàng quét mã hoặc xác nhận giao dịch trên cổng thanh toán; cổng thanh toán xử lý thành công và trả kết quả về hệ thống.
7. Sau khi xác nhận thanh toán thành công, hệ thống cập nhật trạng thái đơn hàng thành `PAID`, lưu bản ghi `Payment`, cộng điểm thưởng Loyalty cho khách hàng, xóa giỏ hàng và hiển thị mã đơn hàng (`ORD-...`).

---

## 2. Luồng thay thế (Alternative Flows)

1. **Chỉnh sửa giỏ hàng trước khi đặt:** Khách hàng thêm, xóa hoặc thay đổi số lượng/tùy chọn món; hệ thống tự động tính lại tổng tiền trước khi thanh toán.
2. **Áp dụng khuyến mãi / Điểm thưởng:** Khách hàng nhập mã giảm giá hợp lệ hoặc chọn dùng điểm Loyalty; hệ thống kiểm tra điều kiện đơn tối thiểu, tính lại số tiền được giảm và trừ vào tổng thanh toán.
3. **Chọn phương thức thanh toán:** Khách hàng linh hoạt chọn thanh toán qua **Ví điện tử** (`WalletPaymentStrategy`) hoặc **Thẻ ngân hàng** (`CardPaymentStrategy`).
4. **Hủy đơn hàng & hoàn trả tồn kho/nguyên liệu:** Khi khách hàng hủy đơn hàng ở trạng thái được phép (`PENDING` hoặc `PAID`), hệ thống chuyển trạng thái đơn sang `CANCELLED` và tự động hoàn lại số lượng tồn kho sản phẩm cùng nguyên vật liệu (và điểm đã dùng nếu có) trong cùng một `$transaction`.
5. **Thử lại thanh toán (`PAYMENT_FAILED`):** Khi đơn hàng đang ở trạng thái `PAYMENT_FAILED`, khách hàng có thể chọn lại phương thức thanh toán và gửi yêu cầu thanh toán mới với `idempotencyKey` mới để tiếp tục thanh toán.
6. **Trùng yêu cầu thanh toán (Idempotency):** Nếu hệ thống nhận lại yêu cầu thanh toán có cùng `idempotencyKey` (do mạng lag hoặc khách hàng bấm đúp), hệ thống trả về kết quả giao dịch đã xử lý trước đó, tuyệt đối không trừ tiền hoặc tạo giao dịch lần hai.

---

## 3. Luồng ngoại lệ (Exception Flows)

1. **Chưa đăng nhập / Token hết hạn:** Nếu khách hàng chưa đăng nhập hoặc JWT Token không hợp lệ khi thực hiện đặt đơn/thanh toán, hệ thống từ chối (`401 Unauthorized`), thông báo lỗi và điều hướng về trang đăng nhập (`/login`).
2. **Giỏ hàng rỗng:** Hệ thống hiển thị tổng tiền bằng `0`, thông báo giỏ hàng đang trống và chặn thao tác đặt hàng (`400 Bad Request`).
3. **Hết hàng / Không đủ nguyên liệu:** Nếu tồn kho sản phẩm hoặc nguyên vật liệu không đủ đáp ứng số lượng đặt, hệ thống không tạo đơn hàng, thông báo chi tiết món/nguyên liệu thiếu để khách hàng điều chỉnh giỏ hàng.
4. **Mã khuyến mãi không hợp lệ / hết hạn / chưa đủ giá trị tối thiểu:** Hệ thống thông báo lý do cụ thể và giữ nguyên tổng tiền hiện tại.
5. **Thanh toán thất bại hoặc khách hàng hủy tại cổng thanh toán:** Hệ thống chuyển trạng thái đơn hàng sang `PAYMENT_FAILED`, **giữ nguyên giỏ hàng / trạng thái đơn** để khách hàng chọn **thử lại thanh toán** hoặc **hủy đơn hàng**.

---

## 4. Hậu điều kiện (Postconditions)

1. **Thanh toán thành công:** Đơn hàng ở trạng thái `PAID`, bản ghi `Payment` (`SUCCESS`) được lưu kèm `idempotencyKey`, điểm thưởng được cộng cho khách hàng và giỏ hàng được làm trống.
2. **Thanh toán thất bại:** Đơn hàng ở trạng thái `PAYMENT_FAILED`, bản ghi `Payment` (`FAILED`) được lưu vết, khách hàng có thể thử lại hoặc hủy đơn.
3. **Đơn hàng bị hủy:** Đơn hàng ở trạng thái `CANCELLED`, tồn kho sản phẩm và nguyên liệu đã được hoàn trả đầy đủ.

---

## 5. Liên kết với mã yêu cầu tương ứng

| Mã yêu cầu | Nội dung yêu cầu liên quan |
| :--- | :--- |
| **FR-03** | Quản lý giỏ hàng & tính tổng tiền |
| **FR-04** | Đăng ký, đăng nhập & xác thực JWT |
| **FR-05** | Đặt đơn hàng & kiểm tra/trừ tồn kho ACID |
| **FR-06** | Thanh toán không tiền mặt (Ví / Thẻ Sandbox) |
| **FR-07** | Xác nhận & theo dõi lịch sử đơn hàng |
| **FR-08** | Quản lý trạng thái đơn hàng & hủy đơn hoàn kho (`OrderStateMachine`) |
| **FR-09** | Áp dụng mã khuyến mãi & tích/dùng điểm thưởng Loyalty |
| **NFR-02** | Bảo mật giao dịch & cơ chế Idempotency chống trừ tiền 2 lần |
