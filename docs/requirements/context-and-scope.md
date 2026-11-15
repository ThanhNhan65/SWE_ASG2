## 1. Bảng Các bên liên quan (Stakeholder)

| Stakeholder | Vai trò | Mục tiêu / Kỳ vọng |
| :--- | :--- | :--- |
| **Khách hàng** | Người đặt đồ uống | Xem menu, chọn size/topping, đặt hàng và thanh toán dễ dàng, theo dõi tiến độ đơn hàng theo thời gian thực. |
| **Nhân viên quầy** | Tiếp nhận và xử lý đơn | Xem đơn hàng mới, cập nhật tuần tự trạng thái đơn hàng (đang chuẩn bị, đã xong, đã giao). |
| **Quản lý cửa hàng** | Quản lý hoạt động cửa hàng | Quản lý danh mục sản phẩm, giá bán, theo dõi doanh thu và lịch sử đơn hàng. |
| **Đơn vị thanh toán** | Xử lý giao dịch | Xử lý cổng thanh toán trực tuyến mô phỏng (ZaloPay, VNPay, thẻ nội địa), phản hồi kết quả thành công/thất bại và hỗ trợ Idempotency. |
| **Giảng viên / Người nghiệm thu** | Đánh giá sản phẩm | Đánh giá tính đầy đủ chức năng, kiến trúc phân lớp, tài liệu thiết kế, độ bao phủ kiểm thử (CI/Test) và khả năng triển khai thực tế. |
| **Nhóm phát triển** | Phân tích, thiết kế, lập trình | Xây dựng hệ thống tuân thủ yêu cầu đề bài, mã nguồn sạch, kiến trúc module hóa, dễ dàng kiểm thử và mở rộng. |

---

## 2. Bảng Phạm vi Thực hiện (In-Scope)

| STT | Chức năng | Mô tả |
| :---: | :--- | :--- |
| **1** | Xem thực đơn (Menu) | Hiển thị danh sách các món đồ uống theo phân loại kèm hình ảnh, mô tả và giá cơ bản. |
| **2** | Chi tiết & Tùy biến món | Xem thông tin chi tiết đồ uống; tùy chọn kích cỡ (S/M/L), định lượng đá, đường, và các loại topping kèm theo. |
| **3** | Giỏ hàng | Thêm, sửa số lượng, xóa món trong giỏ hàng; tự động tính tổng tiền theo tùy chọn kích cỡ và topping theo thời gian thực. |
| **4** | Xác thực & Phân quyền | Đăng ký, đăng nhập tài khoản người dùng, mã hóa mật khẩu và bảo vệ các API nghiệp vụ qua JWT Token. |
| **5** | Đặt hàng | Tạo đơn hàng mới từ giỏ hàng, xác nhận thông tin đơn hàng và khởi tạo trạng thái `PENDING`. |
| **6** | Thanh toán | Thanh toán mô phỏng thông qua ví điện tử (ZaloPay/VNPay) hoặc thẻ, xử lý luồng thanh toán thành công/thất bại và tính toàn vẹn (Idempotency). |
| **7** | Theo dõi lịch sử đơn | Xem danh sách các đơn hàng đã đặt, chi tiết từng đơn và theo dõi trạng thái vòng đời của đơn hàng (`PENDING` ➔ `PAID` ➔ `PREPARING` ➔ `READY` ➔ `COMPLETED` / `CANCELLED`). |
| **8** | Kiểm thử và Triển khai | Thiết lập tự động hóa CI (Install $\rightarrow$ Lint $\rightarrow$ Unit Test $\rightarrow$ Build) và triển khai hệ thống (Local Docker / Cloud Production). |

---

## 3. Bảng Phạm vi Không thực hiện (Out-of-Scope)

| STT | Chức năng không thực hiện | Lý do |
| :---: | :--- | :--- |
| **1** | Thanh toán tiền thật qua ngân hàng | Yêu cầu đồ án chỉ dừng ở mức tích hợp môi trường Sandbox/mô phỏng thanh toán, không phát sinh giao dịch tiền thực tế. |
| **2** | Tích hợp đơn vị vận chuyển bên ngoài | Hệ thống tập trung vào mô hình phục vụ tại quầy/nhận tại cửa hàng (Pick-up), không bao gồm điều phối tài xế giao hàng ngoài (Grab/Ahamove/ShopeeFood). |
| **3** | Đổi quà và chương trình khuyến mãi mở rộng phức tạp | Tập trung vào luồng đặt món cốt lõi, không mở rộng thành hệ sinh thái tích điểm đổi quà bên thứ ba. |
| **4** | Ứng dụng di động Native (Android/iOS) | Dự án phát triển Web App với định hướng Progressive Web App (PWA) trên nền Next.js, có khả năng cài đặt (*Add to Home Screen*) thay cho ứng dụng Native riêng biệt. |

---

## 4. Bảng Giả định (Assumptions)

| STT | Giả định | Giải thích |
| :---: | :--- | :--- |
| **1** | Thiết bị người dùng có kết nối Internet | Hệ thống hoạt động dưới dạng Web/PWA kết nối trực tuyến với máy chủ Backend API. |
| **2** | Môi trường thanh toán là mô phỏng (Sandbox) | Các giao dịch thanh toán trực tuyến sử dụng kịch bản mô phỏng hoặc cổng Sandbox không phát sinh giao dịch tài chính thật. |
| **3** | Một đơn hàng chứa nhiều sản phẩm và tùy biến | Khách hàng có thể đặt nhiều món đồ uống khác nhau trong một đơn, mỗi món có số lượng, kích cỡ và danh sách topping riêng biệt. |
| **4** | Trạng thái đơn hàng được quản lý theo máy trạng thái | Vòng đời đơn hàng tuân thủ quy tắc chuyển đổi chặt chẽ (`OrderStateMachine`), không cho phép nhảy cóc trạng thái bất hợp lệ. |
| **5** | Đội ngũ phát triển cộng tác trên cùng một kho lưu trữ | Toàn bộ thành viên nhóm cùng làm việc trên một Git Monorepo chung, tuân thủ quy trình GitHub Flow và Pull Request. |

---

## 5. Bảng Ràng buộc (Constraints)

| STT | Ràng buộc | Nội dung |
| :---: | :--- | :--- |
| **1** | Công nghệ Frontend | Xây dựng bằng **Next.js** (React, Tailwind CSS, TypeScript) theo hướng Mobile-First và hỗ trợ PWA. |
| **2** | Công nghệ Backend | Xây dựng bằng **NestJS** (Node.js, TypeScript) theo kiến trúc phân lớp hướng module (Modular 3-Tier Layered Architecture). |
| **3** | Cơ sở dữ liệu | Sử dụng hệ quản trị cơ sở dữ liệu quan hệ **PostgreSQL**, quản lý schema và migrations qua **Prisma ORM**. |
| **4** | Quy trình thực hiện nhiệm vụ | Các hạng mục công việc được chia theo các Sprint và thực hiện theo tuần tự yêu cầu của đồ án. |
| **5** | Quản lý mã nguồn & CI/CD | Mã nguồn quản lý trên GitHub; lịch sử commit rõ ràng theo Conventional Commits; quy định Branch Protection bắt buộc phải vượt qua CI Pipeline (Lint, Test, Build) trước khi merge vào nhánh chính. |
