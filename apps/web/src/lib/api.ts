const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
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

async function fetchCatalog(path: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/products${path}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
}

function readCatalog<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Products API returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getProducts(): Promise<Product[]> {
  return readCatalog(await fetchCatalog(''));
}

export async function getProduct(id: number): Promise<Product | null> {
  const response = await fetchCatalog(`/${id}`);
  if (response.status === 404) return null;
  return readCatalog(response);
}

export async function getToppings(): Promise<Topping[]> {
  return readCatalog(await fetchCatalog('/toppings'));
}

/**
 * Lấy danh sách sản phẩm từ API (hỗ trợ filter available & search)
 */
export async function fetchProducts(options?: {
  available?: boolean;
  search?: string;
}): Promise<Product[]> {
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
}

/**
 * Xem chi tiết một sản phẩm theo ID
 */
export async function fetchProductById(id: number): Promise<Product> {
  if (!id || id <= 0 || isNaN(id)) {
    throw new Error('ID sản phẩm không hợp lệ');
  }

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

  return (await res.json()) as Product;
}

/**
 * Lấy danh sách Topping từ API
 */
export async function fetchToppings(): Promise<Topping[]> {
  return getToppings();
}
