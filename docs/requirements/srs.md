
## 1. Sơ đồ Use-Case Tổng quát Toàn Hệ thống

Sơ đồ use-case tổng quát thể hiện các tác nhân và các ca sử dụng tương ứng của hệ thống:

![Sơ đồ Use-Case Tổng quan](file:///c:/CODE/SWE/SWE_ASG2/docs/requirements/UseCase_TongQuan.svg)

---

## 2. Nhóm Danh sách Chức năng cho Khách hàng (Functional Requirements)

### FR-01 -- Hiển thị menu sản phẩm
* **Mô tả**: (Must) Hệ thống cho phép khách hàng xem danh sách đồ uống, hiển thị hình ảnh, tên và giá tiền.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  - Khi khách hàng truy cập menu thì hệ thống hiển thị sản phẩm.
  - Mỗi sản phẩm hiển thị hình ảnh, tên và giá tiền.
  - Danh sách sản phẩm được lấy từ API backend.
  - Khi sản phẩm không còn đủ số lượng, hệ thống hiển thị hàng đã hết.

---

### FR-02 -- Xem chi tiết và tùy chọn sản phẩm
* **Mô tả**: (Must) Hệ thống cho phép khách hàng xem thông tin chi tiết sản phẩm, lựa chọn kích thước, topping.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  - Khách hàng có thể xem chi tiết của một sản phẩm từ menu.
  - Hệ thống hiển thị hình ảnh, tên, giá tiền của sản phẩm.
  - Khách hàng có thể lựa chọn kích thước S, M, L theo tùy thích.
  - Khách hàng có thể lựa chọn topping trong danh sách topping còn khả dụng.
  - Giá sản phẩm được cập nhật theo kích thước và topping được chọn.
  - Khách hàng có thể thêm sản phẩm cùng các tùy chọn vào giỏ hàng.

---

### FR-03 -- Quản lý giỏ hàng
* **Mô tả**: (Must) Hệ thống cho phép khách hàng thêm sản phẩm, thay đổi số lượng, xóa sản phẩm và xem tổng tiền.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  - Khách hàng có thể thêm sản phẩm vào giỏ hàng.
  - Khách hàng có thể tăng hoặc giảm số lượng sản phẩm.
  - Khách hàng có thể xóa sản phẩm khỏi giỏ hàng.
  - Thành tiền của từng sản phẩm được tính theo đơn giá nhân với số lượng.
  - Tổng tiền được cập nhật khi sản phẩm hoặc số lượng thay đổi.
  - Hệ thống hiển thị thông báo khi giỏ hàng không có sản phẩm.

---

### FR-04 -- Đăng ký và đăng nhập
* **Mô tả**: (Must) Hệ thống cho phép khách hàng đăng ký tài khoản và đăng nhập để sử dụng các chức năng yêu cầu xác thực.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  - Khách hàng có thể đăng ký bằng email và mật khẩu hợp lệ.
  - Hệ thống từ chối đăng ký nếu email đã tồn tại.
  - Hệ thống kiểm tra thông tin đăng nhập.
  - Nếu thông tin không chính xác, hệ thống trả về thông báo lỗi phù hợp.
  - Khách hàng chưa đăng nhập không được phép thực hiện chức năng đặt đơn yêu cầu xác thực.

---

### FR-05 -- Tạo đơn hàng
* **Mô tả**: (Must) Hệ thống cho phép khách hàng đã đăng nhập tạo đơn hàng dựa trên các sản phẩm trong giỏ hàng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  - Khách hàng phải đăng nhập trước khi tạo đơn hàng.
  - Hệ thống từ chối tạo đơn nếu giỏ hàng trống.
  - Hệ thống kiểm tra thông tin sản phẩm, số lượng và giá trị đơn hàng trước khi tạo.
  - Khi dữ liệu hợp lệ, hệ thống tạo đơn hàng và lưu vào cơ sở dữ liệu.
  - Đơn hàng mới có trạng thái ban đầu là PENDING.
  - Hệ thống trả về mã đơn hàng sau khi tạo thành công.

---

### FR-06 -- Thanh toán không tiền mặt
* **Mô tả**: (Must) Hệ thống cho phép khách hàng thanh toán đơn hàng bằng ví điện tử hoặc thẻ dịch vụ thông qua ZaloPay.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  - Khách hàng có thể lựa chọn phương thức thanh toán Wallet hoặc Card.
  - Hệ thống hiển thị tổng giá tiền đơn hàng.
  - Khi thanh toán thành công, trạng thái đơn hàng được cập nhật thành PAID.
  - Khi thanh toán thất bại, trạng thái đơn hàng được cập nhật thành PAYMENT-FAILED.
  - Hệ thống thông báo kết quả thanh toán cho khách hàng.
  - Khi thanh toán thất bại, giỏ hàng vẫn được giữ lại để khách hàng có thể thử lại.
  - Khi thanh toán thành công chuyển về hệ thống và hiển thị mã đơn hàng và màn hình thanh toán thành công.

---

### FR-07 -- Xem và xác nhận lịch sử đơn hàng
* **Mô tả**: (Must) Hệ thống cho phép khách hàng xem thông tin xác nhận sau khi đặt hàng và xem lại danh sách các đơn hàng đã thực hiện.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  - Sau khi thanh toán thành công, hệ thống hiển thị mã đơn hàng.
  - Màn hình xác nhận hiển thị trạng thái đơn hàng.
  - Khách hàng đã đăng nhập có thể xem lịch sử đơn hàng của mình.
  - Mỗi đơn hàng hiển thị mã đơn, tổng tiền, thời gian tạo và trạng thái.
  - Khách hàng không được xem lịch sử đơn hàng của tài khoản khác.

---

## 3. Nhóm Danh sách Phi chức năng (Non-Functional Requirements)

### NFR-01 -- Thời gian phản hồi của hệ thống
* **Mô tả**: (Must) Hệ thống phải xử lý yêu cầu từ người dùng trong thời gian hợp lý, đảm bảo trải nghiệm sử dụng không bị gián đoạn.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  - API lấy danh sách sản phẩm (GET /products) phản hồi trong 500ms với dữ liệu mẫu và môi trường kiểm thử thông thường.
  - API lấy thông tin chi tiết sản phẩm phản hồi trong vòng 500ms với dữ liệu mẫu.
  - Các API không được trả về dữ liệu sai định dạng khi có nhiều yêu cầu được gửi liên tiếp.
  - Khi xử lý yêu cầu thất bại, hệ thống phải trả về mã HTTP phù hợp thay vì để yêu cầu bị treo vô thời hạn.

---

### NFR-02 -- Bảo mật tài khoản và dữ liệu
* **Mô tả**: (Must) Hệ thống phải bảo vệ thông tin tài khoản và ngăn chặn người dùng truy cập trái phép vào các chức năng yêu cầu xác thực.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  - Mật khẩu người dùng phải được mã hóa bằng thuật toán băm an toàn trước khi lưu vào cơ sở dữ liệu.
  - Hệ thống sử dụng JWT để xác thực người dùng.
  - Hệ thống phải kiểm tra dữ liệu đầu vào trước khi xử lý.
  - Người dùng chỉ được truy cập dữ liệu đơn hàng thuộc tài khoản của mình.

---

### NFR-03 -- Khả năng truy cập hệ thống
* **Mô tả**: (Should) Hệ thống cần duy trì khả năng truy cập để khách hàng có thể xem menu và thực hiện các thao tác đặt hàng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  - Khi frontend và backend được khởi chạy thành công, người dùng có thể truy cập ứng dụng thông qua trình duyệt.
  - Khi backend không phản hồi, frontend phải hiển thị thông báo lỗi phù hợp.
  - Khi kết nối API được khôi phục, người dùng có thể tiếp tục gửi yêu cầu mà không cần cài đặt lại ứng dụng.

---

### NFR-04 -- Khả năng cài đặt và triển khai
* **Mô tả**: (Must) Hệ thống có khả năng đóng gói, cài đặt và triển khai dễ dàng thông qua Docker hoặc kịch bản tự động hóa.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  - Hỗ trợ khởi chạy toàn bộ hệ thống bằng Docker Compose với một lệnh duy nhất (`docker compose up`).
  - Cung cấp tài liệu hướng dẫn triển khai và các biến môi trường mẫu (`.env.example`).
  - Tích hợp kiểm thử tự động và đóng gói qua quy trình CI/CD.

---

## 4. Nhóm Mức độ Ưu tiên theo Chuẩn MoSCoW

### 4.1. Bảng mức độ ưu tiên của Functional Requirement

| Mã | Tên yêu cầu | Ưu tiên |
| :---: | :--- | :---: |
| **FR-01** | Hiển thị menu sản phẩm | Must |
| **FR-02** | Xem chi tiết và tùy chọn sản phẩm | Must |
| **FR-03** | Quản lý giỏ hàng | Must |
| **FR-04** | Đăng ký và đăng nhập | Must |
| **FR-05** | Tạo đơn hàng | Must |
| **FR-06** | Thanh toán không tiền mặt | Must |
| **FR-07** | Xem và xác nhận lịch sử đơn | Must |

### 4.2. Bảng mức độ ưu tiên của Non Functional Requirement

| Mã | Tên yêu cầu | Ưu tiên |
| :---: | :--- | :---: |
| **NFR-01** | Thời gian phản hồi | Must |
| **NFR-02** | Bảo mật tài khoản và dữ liệu | Must |
| **NFR-03** | Khả năng truy cập hệ thống | Should |
| **NFR-04** | Khả năng cài đặt và triển khai | Must |
