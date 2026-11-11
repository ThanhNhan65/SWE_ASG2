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

async function fetchCatalog(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) throw new Error('NEXT_PUBLIC_API_URL is required');

  return fetch(`${baseUrl.replace(/\/+$/, '')}/products${path}`, {
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
