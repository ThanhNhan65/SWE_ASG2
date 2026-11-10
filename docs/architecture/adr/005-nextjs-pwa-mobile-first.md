# ADR-005: Phân lớp Frontend Next.js (PWA) thành 3 Tầng (UI, State & Logic, Data Access)

- **Trạng thái (Status):** Đã chấp thuận (Accepted)
- **Ngày (Date):** 2026-10-24

## 1. Bối cảnh (Context)
Phần lớn khách hàng đặt đồ uống tại quán hoặc đặt trước từ xa sử dụng thiết bị di động. Ứng dụng Frontend `apps/web - Next.js (PWA)` cần một giao diện tải nhanh trên mạng di động, thao tác chạm (touch-friendly) thuận tiện khi chọn kích cỡ/đường/đá/topping, giữ được giỏ hàng ổn định khi chuyển trang hoặc khi thanh toán lỗi, đồng thời tránh việc viết lẫn lộn mã gọi API (`fetch`), logic tính toán giỏ hàng và mã hiển thị JSX trong cùng một tệp.

## 2. Các phương án đã cân nhắc (Considered Options)
1. **Phát triển ứng dụng Mobile thuần (React Native / Flutter) tách rời hoàn toàn với Web.**
2. **Single Page Application viết gộp (Monolithic Components):** Gọi trực tiếp `fetch` và quản lý trạng thái cục bộ rải rác bên trong từng Component giao diện.
3. **Next.js (App Router) cấu hình PWA, phân tách rõ 3 lớp kiến trúc: `UI Layer` (`[Pages / Components]`) ➔ `State & Logic Layer` (`[Hooks / Cart Store]`) ➔ `Data Access Layer` (`[API Client (fetch)]`).**

## 3. Quyết định & Lý do (Decision & Rationale)
Nhóm quyết định chọn **Phương án 3: Next.js (PWA) theo hướng Mobile-First với kiến trúc 3 lớp (`UI Layer`, `State & Logic Layer`, `Data Access Layer`)**.

**Lý do:**
- **Phân tách trách nhiệm rõ ràng trong `apps/web - Next.js (PWA)`:**
  - **Lớp `UI Layer` (`[Pages / Components]`):** Đảm nhận hiển thị giao diện Mobile-First bằng Tailwind CSS trên các màn hình (`/`, `/products/[id]`, `/cart`, `/checkout`, `/orders`, `/login`) và tích hợp cấu hình PWA (`public/manifest.json`) để cài đặt lên màn hình chính điện thoại (*Add to Home Screen*).
  - **Lớp `State & Logic Layer` (`[Hooks / Cart Store]`):** Sử dụng custom hooks và `Zustand` (`useCartStore`) đồng bộ với `localStorage` để quản lý giỏ hàng, tính tạm tính theo thời gian thực và giữ nguyên giỏ hàng khi thanh toán thất bại (`PAYMENT_FAILED`) để khách thử lại ngay mà không phải chọn lại món.
  - **Lớp `Data Access Layer` (`[API Client (fetch)]`):** Đóng gói toàn bộ giao tiếp `HTTPS / REST + JWT` và truyền `idempotencyKey` xuống `[Controllers]` ở tầng `L1 - Presentation Layer` của Backend (`apps/api - NestJS`).
- **Tối ưu hiệu năng với App Router:** Kết hợp linh hoạt Server Components và Client Components (`'use client'`), giảm lượng JavaScript tải ban đầu nhưng vẫn phản hồi tức thì khi người dùng tương tác.

## 4. Hệ quả & Đánh đổi (Consequences & Trade-offs)
- **Tích cực:** Mã nguồn Frontend sạch, dễ bảo trì và khớp hoàn toàn với sơ đồ kiến trúc phân lớp; một mã nguồn duy nhất phục vụ tốt cả trình duyệt máy tính lẫn thiết bị di động (Responsive PWA).
- **Đánh đổi:** Cần phân định rõ ranh giới giữa Server Component và Client Component (`'use client'`) tại lớp `UI Layer` cũng như kiểm soát quá trình Hydration khi lớp `State & Logic Layer` đọc dữ liệu giỏ hàng từ `localStorage`.
