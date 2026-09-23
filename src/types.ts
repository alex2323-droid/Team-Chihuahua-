export interface BusinessInfo {
  name: string;
  logoUrl?: string;
  whatsapp: string;
  phone?: string;
  email?: string;
  instagram?: string;
  address?: string;
  paymentMethods: string[];
  additionalInfo?: string;
}

export interface ProductAttributes {
  colors?: string[];
  sizes?: string[];
  brand?: string;
  model?: string;
  features?: string[];
  sku?: string;
  availability?: 'Disponible' | 'Bajo pedido' | 'Agotado';
}

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description?: string;
  attributes?: ProductAttributes;
  category?: string;
  imageQuality?: 'Good' | 'Poor';
  imageAnalysisStatus?: 'pending' | 'analyzing' | 'completed' | 'failed';
}

export interface CatalogSettings {
  primaryColor: string; // hex
  secondaryColor: string; // hex
  theme: 'light' | 'dark' | 'minimalist' | 'premium' | 'retro';
  currency: string; // e.g. "USD", "COP", "MXN", "EUR"
  layout: 'grid' | 'list';
  showSku: boolean;
  showAttributes: boolean;
}

export interface Catalog {
  id: string;
  business: BusinessInfo;
  settings: CatalogSettings;
  products: Product[];
  createdAt: string;
}

export interface ImageAnalysisResponse {
  name: string;
  description: string;
  sku?: string;
  attributes?: {
    colors?: string[];
    sizes?: string[];
    brand?: string;
    model?: string;
    features?: string[];
  };
  imageQuality: 'Good' | 'Poor';
}
