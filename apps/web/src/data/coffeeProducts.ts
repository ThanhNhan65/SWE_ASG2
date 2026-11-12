export interface CoffeeProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
  isAvailable: boolean;
  category: 'coffee' | 'tea' | 'other';
}

export const initialCoffeeProducts: CoffeeProduct[] = [
  {
    id: 1,
    name: 'Cà phê sữa đá',
    description: 'Cà phê Robusta đậm đà kết hợp sữa đặc ngọt béo truyền thống.',
    price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=60',
    stock: 50,
    isAvailable: true,
    category: 'coffee',
  },
  {
    id: 2,
    name: 'Americano',
    description: 'Espresso nguyên chất pha loãng với nước ấm/đá, hương vị thanh tao.',
    price: 40000,
    imageUrl: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=500&auto=format&fit=crop&q=60',
    stock: 50,
    isAvailable: true,
    category: 'coffee',
  },
  {
    id: 3,
    name: 'Cappuccino',
    description: 'Sự kết hợp hoàn hảo giữa Espresso, sữa nóng và lớp bọt sữa mịn màng.',
    price: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&auto=format&fit=crop&q=60',
    stock: 40,
    isAvailable: true,
    category: 'coffee',
  },
  {
    id: 4,
    name: 'Trà đào cam sả',
    description: 'Trà thảo mộc thơm mát kết hợp vị ngọt thanh của đào và hương cam sả sảng khoái.',
    price: 39000,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60',
    stock: 60,
    isAvailable: true,
    category: 'tea',
  },
  {
    id: 5,
    name: 'Trà sữa Oolong nướng',
    description: 'Trà Oolong đậm vị trà hòa quyện cùng vị sữa béo ngậy đặc trưng.',
    price: 42000,
    imageUrl: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=500&auto=format&fit=crop&q=60',
    stock: 35,
    isAvailable: true,
    category: 'tea',
  },
];
