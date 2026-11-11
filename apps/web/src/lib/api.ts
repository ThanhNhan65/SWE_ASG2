const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  stock: number;
  isAvailable: boolean;
}

export interface Topping {
  id: number;
  name: string;
  price: number;
  stock: number;
  isAvailable: boolean;
}

/**
 * Lấy danh sách sản phẩm từ API (hỗ trợ filter available & search)
 */
export async function fetchProducts(options?: {
  available?: boolean;
  search?: string;
}): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (options?.available !== undefined) {
      params.append('available', String(options.available));
    }
    if (options?.search) {
      params.append('search', options.search);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/products${queryString}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Lỗi API (${res.status}): Không thể tải danh sách sản phẩm`);
    }

    const data: Product[] = await res.json();
    return data || [];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Đã xảy ra lỗi không xác định khi gọi API sản phẩm');
  }
}

/**
 * Xem chi tiết một sản phẩm theo ID
 */
export async function fetchProductById(id: number): Promise<Product> {
  if (!id || id <= 0 || isNaN(id)) {
    throw new Error('ID sản phẩm không hợp lệ');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (res.status === 404) {
      throw new Error(`Không tìm thấy sản phẩm #${id}`);
    }

    if (!res.ok) {
      throw new Error(`Lỗi API (${res.status}): Không thể tải chi tiết sản phẩm`);
    }

    const data: Product = await res.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Lỗi khi lấy thông tin sản phẩm #${id}`);
  }
}

/**
 * Lấy danh sách Topping từ API
 */
export async function fetchToppings(): Promise<Topping[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/toppings`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Lỗi API (${res.status}): Không thể tải danh sách topping`);
    }

    const data: Topping[] = await res.json();
    return data || [];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Lỗi khi tải danh sách topping');
  }
}
