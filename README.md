# BrewLite - Coffee Ordering System (Assignment 2)

Dự án phát triển hệ thống đặt cà phê trực tuyến **BrewLite** cho môn học **Công nghệ Phần mềm (Software Engineering)**.
- **Frontend**: Next.js (Mobile-first / PWA)
- **Backend**: NestJS (REST API)
- **Database**: PostgreSQL
- **DevOps**: Docker, GitHub Actions CI/CD

---

## 1. Cấu trúc Repository (Monorepo)

Hệ thống được tổ chức theo cấu trúc monorepo phân tách rõ ràng giữa mã nguồn, tài liệu và kiểm thử:

```text
SWE_ASG2/
├── .github/
│   ├── workflows/                # CI/CD Workflows (GitHub Actions)
│   └── pull_request_template.md  # Template kiểm tra DoD cho mỗi PR
├── apps/
│   ├── api/                      # Backend service (NestJS)
│   └── web/                      # Frontend client (Next.js PWA)
├── docs/
│   ├── architecture/             # Tài liệu kiến trúc & ADRs (Task 3)
│   │   └── adr/
│   ├── diagrams/                 # Sơ đồ thiết kế Activity, Sequence, Class (Task 2)
│   ├── requirements/             # Đặc tả yêu cầu, phạm vi và SRS (Task 1)
│   ├── deployment.md             # Hướng dẫn và sơ đồ Deployment (Task 3 & 5)
│   └── traceability-matrix.md    # Ma trận truy vết yêu cầu (Section 8)
├── tests/                        # Integration & End-to-End tests (Task 5)
├── .env.example                  # Biến môi trường mẫu
├── .gitignore                    # Cấu hình bỏ qua tệp nhạy cảm/tạm thời
├── docker-compose.yml            # Docker cấu hình local database & services
└── README.md
```

---

## 2. Chiến lược Branch và Quy trình Pull Request (PR)

### 2.1. Chiến lược Branching (Git Flow rút gọn)

- **`main`**: Nhánh production chính thức. Mã nguồn trên nhánh này luôn phải ở trạng thái sẵn sàng deploy và ổn định tuyệt đối.
- **`develop`**: Nhánh tích hợp cho từng Sprint. Mọi tính năng sau khi hoàn thành sẽ được gộp vào đây để kiểm thử tích hợp.
- **`feature/<tên-tính-năng>`**: Nhánh phát triển tính năng mới (vd: `feature/menu-api`, `feature/cart-ui`). Nhánh này được tách từ `develop` và tạo PR ngược lại vào `develop`.
- **`fix/<tên-lỗi>`**: Nhánh sửa lỗi phát sinh trong quá trình tích hợp.
- **`hotfix/<tên-lỗi-khẩn-cấp>`**: Nhánh sửa lỗi khẩn cấp trực tiếp từ `main`.

### 2.2. Quy trình Pull Request (PR Workflow)

1. **Tuyệt đối không commit trực tiếp** lên nhánh `main` hoặc `develop`.
2. Tạo PR từ `feature/*` vào `develop`.
3. Tiêu đề PR phải tuân theo chuẩn Conventional Commits và gắn mã Issue tương ứng (vd: `feat(api): implement GET /products endpoint (#3)`).
4. Nội dung PR phải điền đầy đủ theo mẫu `.github/pull_request_template.md`.
5. PR chỉ được phép merge khi:
   - Toàn bộ pipeline CI (Lint, Test, Build) chạy **PASS** (màu xanh).
   - Có ít nhất **1 reviewer** duyệt và Approve.
   - Thỏa mãn toàn bộ tiêu chí trong **Definition of Done (DoD)**.

---

## 3. Quy ước Commit (Commit Convention)

Dự án áp dụng nghiêm ngặt chuẩn **[Conventional Commits](https://www.conventionalcommits.org/)**:

### 3.1. Cú pháp Commit

```text
<type>(<scope>): <mô tả ngắn gọn bằng thể mệnh lệnh> [#issue_id]
```

### 3.2. Phân loại Types

| Type | Ý nghĩa & Mục đích sử dụng | Ví dụ |
| :--- | :--- | :--- |
| `feat` | Thêm mới một tính năng cho người dùng hoặc hệ thống | `feat(api): add GET /products and GET /products/:id (#3)` |
| `fix` | Sửa lỗi mã nguồn | `fix(web): fix empty state layout on mobile screens (#5)` |
| `docs` | Thêm, cập nhật tài liệu hoặc sơ đồ | `docs(req): add context and scope in docs/requirements (#2)` |
| `style` | Thay đổi định dạng code (khoảng trắng, formatting, thiếu dấu chấm phẩy) không ảnh hưởng logic | `style(api): format code with prettier` |
| `refactor` | Tái cấu trúc mã nguồn không sửa lỗi, không thêm tính năng | `refactor(api): modularize product repository logic` |
| `test` | Thêm mới hoặc chỉnh sửa unit/integration test | `test(api): add unit test for product service (#6)` |
| `ci` | Thay đổi file cấu hình CI/CD (GitHub Actions) | `ci: add automated PR test & build workflow (#7)` |
| `chore` | Các công việc bảo trì, cập nhật thư viện, cấu hình build | `chore: update dependencies in package.json` |

### 3.3. Các Scope thông dụng

- `api`: Backend NestJS (`apps/api`)
- `web`: Frontend Next.js (`apps/web`)
- `docs`: Thư mục tài liệu (`docs/`)
- `db`: Database, Migration, Seed data
- `infra`: Docker, CI/CD, Deployment scripts

### 3.4. Nguyên tắc Commit

- Không viết thông điệp vô nghĩa như: `update`, `fix bug`, `done`, `test commit`.
- Viết ngắn gọn, rõ ràng, nên tham chiếu đến Issue ID tương ứng (ví dụ: `#3`, `#12`).

---

## 4. Định nghĩa Hoàn thành (Definition of Done - DoD)

Một User Story / Task / Pull Request chỉ được coi là **"HOÀN THÀNH" (DONE)** khi đáp ứng đầy đủ tất cả các tiêu chí sau:

- [ ] **Mã nguồn (Clean Code)**:
  - Code được viết sạch sẽ, dễ hiểu, tuân thủ coding conventions.
  - Không còn `console.log`, code thừa, mã rác hoặc tệp tạm thời.
- [ ] **Kiểm thử (Testing)**:
  - Unit tests / Component tests tương ứng đã được viết.
  - 100% test case chạy **PASS** trên môi trường local.
- [ ] **CI Automation**:
  - Pipeline CI trên GitHub Actions chạy thành công toàn bộ các bước: `Install → Lint → Unit Test → Build`.
- [ ] **Code Review**:
  - Đã mở Pull Request và nhận được ít nhất **1 lượt Approve** từ thành viên khác trong nhóm.
  - Mọi bình luận/góp ý trong quá trình review đã được giải quyết triệt để.
- [ ] **Tài liệu hóa & Truy vết**:
  - Đã cập nhật ma trận truy vết tại `docs/traceability-matrix.md` (nếu có thay đổi mã yêu cầu/API/Test liên quan).
  - Đã cập nhật tài liệu API / tài liệu thiết kế nếu có thay đổi.
- [ ] **Đóng Task (Backlog Management)**:
  - Pull Request đã được merge thành công vào nhánh `develop`.
  - Issue liên quan trên GitHub Projects được đánh dấu `Done` hoặc tự động đóng bằng cú pháp `Closes #issue_id`.

---

## 5. Quản lý Dự án & Backlog

Dự án được quản lý theo mô hình Agile/Scrum qua hai Sprint:
- **Product Backlog & Sprint Board**: Theo dõi trực tiếp tại **[GitHub Projects](https://github.com/ThanhNhan65/SWE_ASG2/projects)**.
- **Sprint 1 (Task 4)**: Xây dựng nền tảng kỹ thuật, đặc tả tài liệu (Task 1-3), MVP luồng xem menu và thiết lập CI tự động.
- **Sprint 2 (Task 5)**: Hoàn thiện luồng đặt hàng end-to-end, thanh toán, kiểm thử tích hợp/E2E, CD tự động và triển khai lên Production.
