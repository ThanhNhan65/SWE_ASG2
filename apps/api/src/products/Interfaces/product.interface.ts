export interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  stock: number;
  isAvailable: boolean;
  version: number;
  createdAt: Date;
}

export type Products = Product;
