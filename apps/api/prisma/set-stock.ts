import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Lấy món đầu tiên (Cà phê sữa đá - ID 1)
  const product = await prisma.product.findFirst({
    orderBy: { id: 'asc' },
  });

  if (!product) {
    console.error('Không tìm thấy sản phẩm nào trong database!');
    return;
  }

  // Cập nhật tồn kho về ĐÚNG 1 LY
  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      stock: 1,
      isAvailable: true,
    },
  });

  console.log('----------------------------------------------------');
  console.log(`✅ ĐÃ CHỈNH TỒN KHO THÀNH CÔNG VỀ 1 SẢN PHẨM:`);
  console.log(`- Mã sản phẩm (ID): ${updated.id}`);
  console.log(`- Tên sản phẩm: ${updated.name}`);
  console.log(`- Tồn kho hiện tại: ${updated.stock} ly duy nhất`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Lỗi khi cập nhật:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
