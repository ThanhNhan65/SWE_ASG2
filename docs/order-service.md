# BÁO CÁO THỰC HIỆN TASK 5.4: QUY TRÌNH ĐẶT HÀNG (ORDER CREATION)

> **Dự án**: BrewLite - Coffee Ordering System  
> **Mã công việc**: Task 5.4 (Sprint 2 - STT 2026-04-05)  
> **Người phụ trách**: Đặng Hoàng Nam (TV6)  
> **Chi tiết công việc**: Tạo API đặt hàng; validate sản phẩm, số lượng và tồn kho; tính tổng tiền phía backend; tạo Order và OrderItem; xử lý transaction và trạng thái đơn hàng.

---

## 1. Cấu trúc Cây Thư Mục & Vị Trí Mã Nguồn

Toàn bộ mã nguồn liên quan đến Task 5.4 được tổ chức tập trung, gọn gàng trong module `orders` của Backend API (`apps/api`) và tài liệu tại `docs/`:

```text
SWE_ASG2/
├── apps/
│   └── api/
│       └── src/
│           └── orders/
│               ├── dto/
│               │   └── create-order.dto.ts     <-- [Task 5.4] DTO validate dữ liệu giỏ hàng (class-validator)
│               ├── orders.controller.ts       <-- [Task 5.4] Endpoint POST /orders tiếp nhận yêu cầu đặt hàng
│               ├── orders.service.ts          <-- [Task 5.4] Nghiệp vụ tính tiền, kiểm tra tồn kho & Transaction
│               ├── order-state-machine.ts     <-- [Task 5.4] Quản lý vòng đời trạng thái đơn (PENDING, PAID...)
│               └── orders.service.spec.ts     <-- [Task 5.4] Unit Tests kiểm thử toàn bộ luồng tạo đơn
└── docs/
    └── order-service.md                       <-- [Task 5.4] Đặc tả API, quy trình nghiệp vụ & hướng dẫn kiểm thử
```

---

## 2. Đặc Tả Endpoint API Tạo Đơn Hàng

- **Giao thức**: `HTTP POST`
- **Đường dẫn**: `/orders`
- **Xác thực**: Hỗ trợ cả người dùng đã đăng nhập (lấy `userId` từ token JWT) hoặc khách vãng lai (lấy `userId` từ body, mặc định khách hàng mẫu).

### 2.1. Request Payload (Body)

```json
{
  "userId": 1,
  "items": [
    {
      "productId": 1,
      "size": "M",
      "sweetness": "100%",
      "ice": "Bình thường",
      "toppings": [
        { "id": 1, "name": "Trân châu đen", "price": 10000 }
      ],
      "quantity": 2
    }
  ],
  "promotionCode": "BREWLITE20"
}
```

### 2.2. Response Payload Mẫu (Thành công - 201 Created)

```json
{
  "message": "Tạo đơn hàng thành công",
  "orderCode": "ORD-15",
  "id": 15,
  "userId": 1,
  "status": "PENDING",
  "subtotal": 100000,
  "discountAmount": 20000,
  "total": 80000,
  "pointsEarned": 80,
  "promotionId": 1,
  "items": [
    {
      "id": 28,
      "orderId": 15,
      "productId": 1,
      "size": "M",
      "sweetness": "100%",
      "ice": "Bình thường",
      "toppings": [
        { "id": 1, "name": "Trân châu đen", "price": 10000 }
      ],
      "unitPrice": 50000,
      "qty": 2,
      "lineTotal": 100000,
      "product": {
        "id": 1,
        "name": "Cà phê sữa đá",
        "price": 35000,
        "imageUrl": "..."
      }
    }
  ],
  "user": {
    "id": 1,
    "email": "customer@brewlite.vn",
    "fullName": "Khách hàng Thử Nghiệm"
  }
}
```

---

## 3. Quy Trình Xử Lý Nghiệp Vụ Tại Backend (`OrdersService`)

Mã nguồn tại [`apps/api/src/orders/orders.service.ts`](../apps/api/src/orders/orders.service.ts) thực thi nghiêm ngặt theo 6 bước:

```
[Client gửi Giỏ hàng]
         │
         ▼
[1. Validate DTO] ───────────────► Báo lỗi 400 nếu rỗng hoặc thiếu trường
         │
         ▼
[2. Kiểm tra Sản phẩm & Kho] ────► Báo lỗi 404 (không tồn tại) hoặc 400 (hết hàng / tạm ngưng)
         │
         ▼
[3. Tính toán Giá tiền Backend] ─► Base Price + Size Modifier + Toppings (Chống gian lận giá)
         │
         ▼
[4. Xử lý Mã Khuyến mãi] ────────► Kiểm tra Hạn dùng, Min Order, Tính Discount Amount
         │
         ▼
┌────────────────────────────────────────────────────────┐
│     5. Database Transaction (Prisma $transaction)      │
│                                                        │
│  a. Atomic decrement tồn kho sản phẩm:                 │
│     stock = stock - quantity, version = version + 1    │
│  b. Tăng lượt sử dụng mã khuyến mãi (usedCount)       │
│  c. Tạo bản ghi Order với trạng thái PENDING           │
│  d. Tạo các bản ghi OrderItem tương ứng               │
└────────────────────────────────────────────────────────┘
         │
         ▼
[6. Trả về Order & Mã đơn ORD-{id}]
```

### Các nguyên tắc an toàn dữ liệu:
1. **Chống gian lận giá (Client-side tampering)**: Không tin tưởng bất kỳ trường giá tiền nào gửi lên từ frontend. Mọi đơn giá (`product.price`), phụ thu size và phụ thu topping đều được tra cứu và tính toán trực tiếp từ cơ sở dữ liệu.
2. **Kiểm soát tồn kho & Chống race condition**: Kiểm tra tồn kho trước khi tạo đơn và sử dụng câu lệnh `stock: { decrement: quantity }` bên trong transaction nguyên tử `$transaction` để chống bán vượt số lượng tồn kho.
3. **Trạng thái khởi tạo chuẩn xác**: Đơn hàng vừa tạo luôn có trạng thái mặc định là `PENDING` (chờ thanh toán), chuẩn bị chuyển sang module thanh toán của Đăng (Task 5.5).

---

## 4. Xử Lý Các Trường Hợp Ngoại Lệ (Exceptions)

| Trường hợp vi phạm | Mã lỗi HTTP | Thông báo phản hồi |
| :--- | :---: | :--- |
| Giỏ hàng không có sản phẩm nào | `400 Bad Request` | `Giỏ hàng không được để trống khi đặt hàng.` |
| Sản phẩm không có trong DB | `404 Not Found` | `Sản phẩm với ID {id} không tồn tại.` |
| Sản phẩm tạm ngưng phục vụ | `400 Bad Request` | `Sản phẩm "{name}" hiện đang tạm ngừng phục vụ.` |
| Đặt vượt quá số lượng trong kho | `400 Bad Request` | `Sản phẩm "{name}" chỉ còn {stock} phần trong kho, không đủ đáp ứng số lượng yêu cầu ({qty}).` |
| Mã khuyến mãi hết hạn/không hợp lệ | `400 Bad Request` | `Mã khuyến mãi "{code}" không tồn tại hoặc đã bị vô hiệu hóa.` |
| Đơn chưa đạt giá trị tối thiểu của mã | `400 Bad Request` | `Đơn hàng tối thiểu phải từ {min}đ để áp dụng mã "{code}".` |

---

## 5. Kết Quả Kiểm Thử Đơn Vị (Unit Tests)

Bộ kiểm thử tại [`apps/api/src/orders/orders.service.spec.ts`](../apps/api/src/orders/orders.service.spec.ts) bao gồm các kịch bản kiểm tra:
1. `chặn lỗi khi giỏ hàng rỗng`: Đảm bảo ném `BadRequestException`.
2. `chặn lỗi khi sản phẩm không tồn tại trong CSDL`: Đảm bảo ném `NotFoundException`.
3. `chặn lỗi khi sản phẩm tạm ngưng phục vụ (isAvailable = false)`: Đảm bảo ném `BadRequestException`.
4. `chặn lỗi khi số lượng đặt vượt quá tồn kho`: Đảm bảo ném `BadRequestException`.
5. `tạo đơn hàng thành công, tính đúng tiền, trừ tồn kho và trạng thái PENDING`: Kiểm tra tính đúng subtotal, tạo order và gọi lệnh trừ kho.
6. `áp dụng mã khuyến mãi thành công và tính đúng tiền giảm giá`: Kiểm tra tính chiết khấu phần trăm (Percentage) và cập nhật `usedCount`.
