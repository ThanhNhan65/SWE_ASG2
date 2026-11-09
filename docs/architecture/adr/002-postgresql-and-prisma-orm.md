# ADR-002: Sử dụng PostgreSQL kết hợp Prisma ORM và Giao dịch ACID

- **Trạng thái (Status):** Đã chấp thuận (Accepted)
- **Ngày (Date):** 2026-10-16

## 1. Bối cảnh (Context)
Hệ thống **BrewLite** xử lý các luồng dữ liệu có tính liên kết chặt chẽ và nhạy cảm về tài chính: người dùng (`User`), danh mục đồ uống (`Product`), đơn hàng (`Order`, `OrderItem`), thanh toán (`Payment`) và mã khuyến mãi (`Promotion`). Khi khách hàng đặt đơn hoặc thanh toán, hệ thống phải cập nhật đồng thời nhiều bảng mà không được phép để xảy ra trạng thái dữ liệu nửa vời (ví dụ: đã trừ tiền nhưng đơn hàng chưa chuyển sang `PAID`, hoặc đã tạo đơn nhưng chưa trừ tồn kho).

## 2. Các phương án đã cân nhắc (Considered Options)
1. **NoSQL (MongoDB + Mongoose):** Linh hoạt về cấu trúc tài liệu nhưng phức tạp hơn khi xử lý quan hệ nhiều bảng và ràng buộc khóa ngoại nghiêm ngặt.
2. **PostgreSQL + TypeORM:** Hỗ trợ cơ sở dữ liệu quan hệ thông qua Decorator trên các class Entity, nhưng độ an toàn kiểu dữ liệu (Type-safety) khi truy vấn phức tạp chưa tối ưu.
3. **PostgreSQL + Prisma ORM:** Sử dụng tệp khai báo lược đồ tập trung (`schema.prisma`), tự động sinh Prisma Client chuẩn TypeScript Strict Mode và hỗ trợ cơ chế Migration/Seed cùng giao dịch nguyên tử (`$transaction`).

## 3. Quyết định & Lý do (Decision & Rationale)
Nhóm quyết định chọn **Phương án 3: PostgreSQL (`brewlite_db`) kết hợp Prisma ORM**.

**Lý do:**
- **Đảm bảo tính toàn vẹn ACID tuyệt đối:** Thông qua `this.prisma.$transaction`, mọi thao tác tạo đơn hàng + trừ tồn kho sản phẩm, hoặc lưu kết quả thanh toán + cập nhật trạng thái đơn + cộng điểm thưởng thành viên (`loyaltyPoints`) đều thành công cùng nhau hoặc rollback toàn bộ nếu có lỗi.
- **Type-Safety 100% ở thời điểm biên dịch:** Prisma tự động sinh các kiểu dữ liệu và `enum` (`OrderStatus`, `PaymentMethod`, `PaymentStatus`, `ProductSize`) khớp hoàn toàn với TypeScript ở tầng Service, loại bỏ lỗi sai tên cột hay sai kiểu dữ liệu.
- **Tái tạo môi trường dễ dàng:** Cơ chế `prisma db push` / `prisma migrate` và kịch bản `prisma/seed.ts` cho phép khởi tạo lại toàn bộ cơ sở dữ liệu chuẩn trên máy local, Docker hoặc CI chỉ bằng một lệnh.

## 4. Hệ quả & Đánh đổi (Consequences & Trade-offs)
- **Tích cực:** Ngăn chặn triệt để lỗi sai lệch dữ liệu tài chính và tồn kho; câu lệnh truy vấn ngắn gọn, chống tấn công SQL Injection mặc định.
- **Đánh đổi:** Cần chạy bước `prisma generate` mỗi khi thay đổi tệp `schema.prisma` để cập nhật lại kiểu dữ liệu cho trình biên dịch TypeScript.
