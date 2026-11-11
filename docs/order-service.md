# BÁO CÁO THỰC HIỆN TASK 5.4: QUY TRÌNH ĐẶT HÀNG & KIỂM SOÁT TỒN KHO

> **Dự án**: BrewLite - Coffee Ordering System  
> **Mã công việc**: Task 5.4 (Sprint 2 - STT 2026-04-05) & Task 10 (Nghiệp vụ backend nâng cao)  
> **Người phụ trách**: Đặng Hoàng Nam (TV6)  
> **Chi tiết công việc**: Tạo API đặt hàng; validate sản phẩm, số lượng và tồn kho; tính tổng tiền phía backend; tạo Order và OrderItem; xử lý transaction ACID và kiểm soát tồn kho đồng thời (Optimistic Locking).

---

## 1. Cấu trúc Cây Thư Mục & Vị Trí Mã Nguồn

Toàn bộ mã nguồn liên quan đến Task 5.4 được tổ chức tập trung, kế thừa và tối ưu hóa từ kinh nghiệm của Assignment 1:

```text
SWE_ASG2/
├── apps/
│   └── api/
│       └── src/
│           ├── orders/
│           │   ├── dto/
│           │   │   └── create-order.dto.ts     <-- [Task 5.4] DTO validate dữ liệu giỏ hàng (class-validator)
│           │   ├── orders.controller.ts       <-- [Task 5.4] Endpoint POST /orders tiếp nhận yêu cầu đặt hàng
│           │   ├── orders.service.ts          <-- [Task 5.4] Nghiệp vụ tính tiền, kiểm tra tồn kho & Transaction
│           │   ├── order-state-machine.ts     <-- [Task 5.4] Quản lý vòng đời trạng thái đơn (PENDING, PAID...)
│           │   └── orders.service.spec.ts     <-- [Task 5.4] Unit Tests kiểm thử luồng tạo đơn & Concurrency
│           └── products/
│               └── sugar-ice.calculator.ts    <-- [Task 5.4] Định mức tiêu thụ nguyên liệu (Đường, Đá, Cafe, Trà, Sữa)
└── docs/
    └── order-service.md                       <-- [Task 5.4] Đặc tả API, quy trình nghiệp vụ & tài liệu báo cáo
```

---

## 2. Đặc Tả Endpoint API Tạo Đơn Hàng

- **Giao thức**: `HTTP POST`
- **Đường dẫn**: `/orders`
- **Xác thực**: Hỗ trợ cả người dùng đã đăng nhập (lấy `userId` từ token JWT) hoặc khách vãng lai (lấy `userId` từ body, mặc định khách hàng mẫu `customer@brewlite.vn`).

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
[1. Validate DTO] ─────────────────────► Báo lỗi 400 nếu rỗng hoặc thiếu trường
         │
         ▼
[2. Kiểm tra Món & Tồn kho] ──────────► Báo lỗi 404 (không tồn tại) hoặc 400 (hết món)
         │
         ▼
[3. Kiểm tra Định mức Nguyên liệu] ───► Tính định mức Cà phê, Trà, Sữa, Đường, Đá
         │
         ▼
[4. Tính toán Giá tiền Backend] ──────► Base Price + Size Modifier + Toppings (Chống gian lận giá)
         │
         ▼
[5. Xử lý Mã Khuyến mãi] ──────────────► Kiểm tra Hạn dùng, Min Order, Tính Discount Amount
         │
         ▼
┌────────────────────────────────────────────────────────┐
│     6. Database Transaction (Prisma $transaction)      │
│                                                        │
│  a. Atomic decrement tồn kho món (Optimistic Lock):    │
│     stock = stock - quantity, version = version + 1    │
│  b. Atomic decrement tồn kho nguyên liệu (nếu có)      │
│  c. Tăng lượt sử dụng mã khuyến mãi (usedCount)       │
│  d. Tạo bản ghi Order với trạng thái PENDING           │
│  e. Tạo các bản ghi OrderItem tương ứng               │
└────────────────────────────────────────────────────────┘
         │
         ▼
[Trả về Order & Mã đơn ORD-{id}]
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
| Kho không đủ nguyên liệu | `400 Bad Request` | `Kho không đủ hạt cà phê/lá trà/sữa/đường/đá để pha chế...` |
| Mã khuyến mãi hết hạn/không hợp lệ | `400 Bad Request` | `Mã khuyến mãi "{code}" không tồn tại hoặc đã bị vô hiệu hóa.` |
| Đơn chưa đạt giá trị tối thiểu của mã | `400 Bad Request` | `Đơn hàng tối thiểu phải từ {min}đ để áp dụng mã "{code}".` |

---

## 5. Kết Quả Kiểm Thử Đơn Vị (Unit Tests)

Bộ kiểm thử tại [`apps/api/src/orders/orders.service.spec.ts`](../apps/api/src/orders/orders.service.spec.ts) bao gồm:
1. **Kiểm thử logic OrderStateMachine**: Chuyển trạng thái hợp lệ và chặn các chuyển đổi bất hợp lệ.
2. **Kiểm thử quy trình tạo đơn hàng**: Chặn giỏ hàng rỗng, chặn món không tồn tại, kiểm tra hết hàng, tạo đơn thành công, áp dụng mã voucher.
3. **Kiểm thử Optimistic Locking & Xử lý đồng thời (Concurrency)**:
   - Giả lập 10 requests cùng đặt mua 1 sản phẩm có tồn kho = 5 tại cùng 1 thời điểm.
   - Kết quả: Không bị bán vượt tồn kho (race condition), tồn kho không bao giờ bị âm.
