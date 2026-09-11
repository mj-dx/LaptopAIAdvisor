export type Product = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  price: number;
  cpu: string | null;
  ram: string | null;
  storage: string | null;
  gpu: string | null;
  screen: string | null;
  battery: string | null;
  image_url: string | null;
  created_at?: string;
};