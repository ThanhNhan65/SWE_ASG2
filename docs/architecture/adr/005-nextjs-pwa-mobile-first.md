# ADR-005: Xây dựng Giao diện Người dùng bằng Next.js App Router theo hướng Mobile-First / PWA

- **Trạng thái (Status):** Đã chấp thuận (Accepted)
- **Ngày (Date):** 2026-10-24

## 1. Bối cảnh (Context)
Phần lớn khách hàng đặt đồ uống tại quán hoặc đặt trước từ xa sử dụng thiết bị di động. Hệ thống BrewLite cần một giao diện tải nhanh trên mạng di động, thao tác chạm (touch-friendly) thuận tiện khi chọn kích cỡ/topping, giữ được giỏ hàng ổn định và có khả năng cài đặt lên màn hình chính điện thoại mà không bắt buộc người dùng phải tải ứng dụng nặng nề từ kho ứng dụng.

## 2. Các phương án đã cân nhắc (Considered Options)
1. **Phát triển ứng dụng Mobile thuần (React Native / Flutter) tách rời hoàn toàn với Web.**
2. **Single Page Application truyền thống (Vite + React CSR):** Toàn bộ trang chỉ được dựng sau khi trình duyệt tải xong gói JavaScript lớn.
3. **Next.js (App Router) kết hợp Tailwind CSS, Zustand và cấu hình Progressive Web App (PWA).**

## 3. Quyết định & Lý do (Decision & Rationale)
Nhóm quyết định chọn **Phương án 3: Next.js App Router theo hướng Mobile-First / PWA**.

**Lý do:**
- **Kết hợp linh hoạt Server Components (RSC) và Client Components:** Giảm thiểu lượng JavaScript gửi xuống trình duyệt ở các phần giao diện tĩnh, trong khi vẫn đảm bảo phản hồi tức thì ở các màn hình tương tác cao như tùy chỉnh đồ uống, giỏ hàng và thanh toán.
- **Trải nghiệm PWA trên di động:** Tệp `public/manifest.json` cấu hình chế độ hiển thị độc lập (`display: "standalone"`), biểu tượng và màu sắc thương hiệu giúp ứng dụng hoạt động mượt mà như một ứng dụng di động thực thụ khi người dùng thêm vào màn hình chính (*Add to Home Screen*).
- **Bảo toàn trạng thái giỏ hàng:** Sử dụng `Zustand` đồng bộ với `localStorage` giúp khách hàng không bị mất danh sách đồ uống đã chọn khi chuyển qua bước đăng nhập hoặc khi thanh toán thất bại cần thử lại.

## 4. Hệ quả & Đánh đổi (Consequences & Trade-offs)
- **Tích cực:** Một mã nguồn Frontend duy nhất phục vụ tốt cả trình duyệt máy tính lẫn thiết bị di động (Responsive Mobile-First); triển khai nhanh chóng qua Docker hoặc các nền tảng đám mây/CDN.
- **Đánh đổi:** Cần phân định rõ ranh giới giữa Server Component và Client Component (`'use client'`) cũng như kiểm soát quá trình Hydration khi đọc dữ liệu từ `localStorage`.
