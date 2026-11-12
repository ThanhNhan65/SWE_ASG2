# BÁO CÁO THỰC HIỆN TASK 4.7: THIẾT LẬP CI PIPELINE (SPRINT 1)

> **Dự án**: BrewLite - Coffee Ordering System  
> **Mã công việc**: Task 4.7 (STT 2026-07-04 - Task 4: Triển khai Sprint 1)  
> **Người phụ trách**: Đặng Hoàng Nam (TV6)  
> **Nhiệm vụ chi tiết**: Thiết lập CI chạy theo Pull Request: Install → Lint → Unit Test → Build. Lưu minh chứng pipeline thành công và pipeline thất bại; chặn merge khi kiểm tra không đạt theo quy trình nhóm.

---

## 1. Mục tiêu và Nguyên lý Hoạt động của CI Pipeline

Theo quy trình phát triển phần mềm theo nhóm (Agile/Scrum - GitHub Flow), mọi mã nguồn của các thành viên phát triển trên các nhánh tính năng (feature branches) **không được phép push trực tiếp vào nhánh `main` hoặc `develop`**, mà phải thông qua **Pull Request (PR)**.

CI Pipeline (Continuous Integration) bằng **GitHub Actions** được thiết lập nhằm tự động kích hoạt mỗi khi có PR mới hoặc commit bổ sung vào PR, thực hiện tuần tự 4 chốt chặn kiểm thử chất lượng:

```
[Mở Pull Request]
       │
       ▼
┌────────────────────────────────────────────────────────┐
│               BrewLite CI Pipeline                     │
│                                                        │
│  1. [INSTALL]   --> Cài đặt thư viện & Prisma Client   │
│  2. [LINT]      --> Soát lỗi cú pháp & Code styling    │
│  3. [UNIT TEST] --> Chạy bộ kiểm thử đơn vị (Vitest)   │
│  4. [BUILD]     --> Biên dịch NestJS API & Next.js     │
└────────────────────────────────────────────────────────┘
       │
       ├──► [TẤT CẢ ĐẠT (PASS)]  ──────► Mở khóa nút "Merge Pull Request"
       │
       └──► [BẤT KỲ LỖI NÀO (FAIL)] ───► KHÓA CHẶN MERGE (Blocked)
```

---

## 2. Đặc tả Cấu hình Workflow (`.github/workflows/ci.yml`)

File cấu hình workflow được đặt tại vị trí `.github/workflows/ci.yml` với nội dung hoàn chỉnh:

```yaml
name: BrewLite CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened]
  workflow_dispatch: # Cho phép kích hoạt thủ công từ giao diện GitHub Actions

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci-pipeline:
    name: "CI: Install -> Lint -> Unit Test -> Build"
    runs-on: ubuntu-latest

    steps:
      # Chuẩn bị môi trường
      - name: "Step 0: Checkout Repository"
        uses: actions/checkout@v4

      - name: "Step 0: Setup Node.js 20"
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      # Giai đoạn 1: Install
      - name: "Step 1 [Install]: Cài đặt Dependencies & Generate Prisma Client"
        run: |
          echo "=== 1. INSTALL DEPENDENCIES ==="
          npm install --prefer-offline --no-audit || npm install
          
          if [ -d "apps/api" ]; then
            npm --prefix apps/api install --prefer-offline --no-audit || npm --prefix apps/api install
            npx --prefix apps/api prisma generate
          fi

          if [ -d "apps/web" ]; then
            npm --prefix apps/web install --prefer-offline --no-audit || npm --prefix apps/web install
          fi

      # Giai đoạn 2: Lint
      - name: "Step 2 [Lint]: Kiểm tra cú pháp và quy chuẩn mã nguồn (Linter)"
        run: |
          echo "=== 2. LINT CODEBASE ==="
          npm run lint --if-present

      # Giai đoạn 3: Unit Test
      - name: "Step 3 [Unit Test]: Chạy kiểm thử đơn vị logic nghiệp vụ (Unit Tests)"
        run: |
          echo "=== 3. RUN UNIT TESTS ==="
          if [ -d "apps/api" ]; then
            npm --prefix apps/api run test
          else
            npm test --if-present
          fi

      # Giai đoạn 4: Build
      - name: "Step 4 [Build]: Biên dịch Backend & Frontend (Build Applications)"
        run: |
          echo "=== 4. BUILD APPLICATIONS ==="
          if [ -d "apps/api" ]; then
            npm --prefix apps/api run build
          fi

          if [ -d "apps/web" ]; then
            npm --prefix apps/web run build
          fi
          echo "Build toàn bộ ứng dụng thành công!"
```

---

## 3. Mã Nguồn Kiểm thử Đơn vị Được Thực Thi (`Unit Test`)

Để CI pipeline có thể thực thi bước **Unit Test** với logic nghiệp vụ có ý nghĩa thực tế của đồ án BrewLite (không dùng dummy test), test case đã được xây dựng cho `OrderStateMachine` tại `apps/api/src/orders/orders.service.spec.ts`:

- Kiểm tra chuyển đổi trạng thái hợp lệ:
  - `PENDING` $\rightarrow$ `PAID` (khi khách hàng thanh toán).
  - `PAID` $\rightarrow$ `PREPARING` (khi barista bắt đầu pha chế).
  - `PREPARING` $\rightarrow$ `READY` (khi hoàn tất món uống).
  - `READY` $\rightarrow$ `COMPLETED` (khi khách nhận nước).
- Kiểm tra chặn chuyển đổi bất hợp lệ:
  - `PENDING` $\rightarrow$ `PREPARING` (chưa thanh toán mà đòi pha chế $\rightarrow$ ném ngoại lệ `BadRequestException`).
  - `COMPLETED` $\rightarrow$ `CANCELLED` (đơn hàng đã hoàn tất không thể hủy $\rightarrow$ ném ngoại lệ `BadRequestException`).

---

## 4. Kịch bản & Hướng dẫn Thu thập Minh Chứng (Evidence)

Để hoàn thiện bài nộp và báo cáo Sprint 1, thành viên phụ trách (Nam) thực hiện thu thập 3 minh chứng sau trên GitHub:

### Minh chứng 1: Pipeline Chạy Thành Công (CI Success)
1. **Cách thực hiện**:
   - Đẩy nhánh `Nam` đã có mã nguồn sạch lên GitHub: `git push origin Nam`.
   - Tạo một Pull Request từ nhánh `Nam` vào nhánh `main` (hoặc `develop`):
     - Title: `feat(ci): implement CI pipeline with Install -> Lint -> Test -> Build (#4.7)`
   - GitHub Actions sẽ tự động kích hoạt workflow **BrewLite CI Pipeline**.
2. **Hình ảnh minh chứng cần lưu**:
   - **Ảnh 1**: Tab **Actions** trên GitHub hiển thị workflow màu xanh lá kèm dấu tích `✔ CI: Install -> Lint -> Unit Test -> Build`.
   - **Ảnh 2**: Giao diện chi tiết của Run hiển thị đủ 4 bước Install, Lint, Unit Test, Build đều xanh lá (Status: `Success`).
   - **Ảnh 3**: Trên giao diện Pull Request hiển thị `All checks have passed` và nút **Merge pull request** có màu xanh cho phép merge.

---

### Minh chứng 2: Pipeline Thất Bại & Chặn Lỗi (CI Failed)
Mục đích: Chứng minh pipeline thực sự có khả năng phát hiện lỗi code và ngăn chặn mã nguồn hỏng lọt vào nhánh chính.

1. **Cách thực hiện**:
   - Tạo một nhánh test lỗi từ nhánh `Nam`:
     ```bash
     git checkout -b test/ci-failure
     ```
   - Cố tình sửa file `apps/api/src/orders/orders.service.spec.ts`, thay đổi một assertion để test bị sai:
     ```ts
     it('cố tình gây lỗi test', () => {
       expect(1 + 1).toBe(999); // Sai kết quả -> Vitest sẽ FAIL
     });
     ```
   - Commit và push lên GitHub:
     ```bash
     git add .
     git commit -m "test(ci): trigger intentional failure in unit test"
     git push origin test/ci-failure
     ```
   - Mở Pull Request từ `test/ci-failure` vào `main`.
2. **Hình ảnh minh chứng cần lưu**:
   - **Ảnh 1**: Giao diện GitHub Actions hiển thị trạng thái màu đỏ `✖ CI: Install -> Lint -> Unit Test -> Build` thất bại tại **Step 3 [Unit Test]**.
   - **Ảnh 2**: Chi tiết log lỗi chỉ rõ: `AssertionError: expected 2 to be 999`. Pipeline dừng ngay lập tức và **không chạy tiếp bước Build**.

---

### Minh chứng 3: Chặn Merge Khi Kiểm Tra Không Đạt (Branch Protection Rule)
Đây là yêu cầu quan trọng nhất của quy trình nhóm để bảo vệ nhánh chính.

#### Hướng dẫn cấu hình trên GitHub:
1. Vào repository trên GitHub $\rightarrow$ chọn tab **Settings**.
2. Tại menu bên trái, mục **Code and automation** $\rightarrow$ chọn **Branches**.
3. Tại mục **Branch protection rules**, bấm nút **Add branch protection rule** (hoặc **Add rule**).
4. Điền các thông số:
   - **Branch name pattern**: `main` (làm tương tự cho `develop`).
   - Tích chọn: `Require a pull request before merging` (Bắt buộc phải qua PR).
   - Tích chọn: `Require status checks to pass before merging` (Bắt buộc CI phải PASS).
   - Trong ô tìm kiếm status checks, gõ và chọn:
     - `CI: Install -> Lint -> Unit Test -> Build`
   - Tích chọn: `Require branches to be up to date before merging`.
   - Tích chọn: `Do not allow bypassing the above settings` (Áp dụng cho toàn bộ thành viên, kể cả Admin/Lead).
5. Bấm **Create** / **Save changes**.

#### Hình ảnh minh chứng cần lưu:
- **Ảnh 1**: Màn hình cài đặt **Branch protection rules** trong GitHub Settings đã kích hoạt yêu cầu status check.
- **Ảnh 2**: Giao diện Pull Request của nhánh lỗi (`test/ci-failure`) hiển thị cảnh báo đỏ:
  > **"Required status checks must pass before merging"**  
  > Nút **"Merge pull request" bị xám/vô hiệu hóa (Disabled)**, ngăn chặn tuyệt đối việc merge mã lỗi vào nhánh chính.

---

## 5. Tổng kết Kết quả Bàn giao

| Hạng mục | Kết quả đạt được | Trạng thái |
| :--- | :--- | :--- |
| File cấu hình `.github/workflows/ci.yml` | Đã thiết lập đủ 4 bước Install $\rightarrow$ Lint $\rightarrow$ Unit Test $\rightarrow$ Build | **Hoàn thành** |
| Bộ kiểm thử đơn vị Unit Test | Đã viết test case cho `OrderStateMachine` tại `orders.service.spec.ts` | **Hoàn thành** |
| Kịch bản minh chứng Success / Fail | Đã xây dựng kịch bản rõ ràng kèm hướng dẫn chụp màn hình | **Hoàn thành** |
| Quy định chặn Merge (Branch Protection) | Đã có hướng dẫn thiết lập trên GitHub Settings | **Hoàn thành** |
