import { BusinessInfo, CatalogSettings, Product } from '../types';

const STORAGE_KEY_BUSINESS = 'saved_store_business';
const STORAGE_KEY_SETTINGS = 'saved_catalog_settings';
const STORAGE_KEY_PRODUCTS = 'saved_catalog_products';

/**
 * Compresses an image file (e.g. logo) to a maximum dimension on an HTML5 canvas.
 * Produces a lightweight Base64 string ideal for local storage and fast rendering.
 */
export async function compressLogoImage(file: File, maxDimension = 360): Promise<string> {
  return compressImageFile(file, maxDimension, 0.88);
}

/**
 * Compresses a product photo to max 800px dimension and ~80KB JPEG.
 * Ensures fast upload, instant storage in localStorage and database, and zero memory lag on smartphones.
 */
export async function compressProductImage(file: File, maxDimension = 800): Promise<string> {
  return compressImageFile(file, maxDimension, 0.82);
}

function compressImageFile(file: File, maxDimension: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Error al decodificar la imagen'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let w = img.width || 400;
          let h = img.height || 400;

          if (w > maxDimension || h > maxDimension) {
            if (w >= h) {
              h = Math.round((h * maxDimension) / w);
              w = maxDimension;
            } else {
              w = Math.round((w * maxDimension) / h);
              h = maxDimension;
            }
          }

          canvas.width = Math.max(w, 50);
          canvas.height = Math.max(h, 50);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          // Render image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Use JPEG for optimal compression ratio
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Saves business profile, settings and optionally products to both localStorage and the backend server.
 */
export async function saveStoreProfile(
  business: BusinessInfo,
  settings: CatalogSettings,
  products?: Product[]
): Promise<{ success: boolean; message: string }> {
  // 1. Save immediately to LocalStorage for instant offline persistence
  try {
    localStorage.setItem(STORAGE_KEY_BUSINESS, JSON.stringify(business));
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    if (products) {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    }
    localStorage.setItem('store_profile_last_saved', new Date().toISOString());
  } catch (lsErr) {
    console.warn('[StoreProfile] localStorage save warning:', lsErr);
  }

  // 2. Persist to backend server API
  try {
    const res = await fetch('/api/store-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business, settings, products }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Error al guardar en el servidor');
    }

    return {
      success: true,
      message: '¡Configuración, contactos, logo y productos guardados con éxito!',
    };
  } catch (serverErr: any) {
    console.warn('[StoreProfile] Server save warning:', serverErr.message);
    return {
      success: true,
      message: 'Configuración guardada en tu dispositivo.',
    };
  }
}

/**
 * Fast endpoint to persist products directly to localStorage and server
 */
export async function saveStoreProducts(products: Product[]): Promise<boolean> {
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.warn('LocalStorage products save error:', e);
  }

  try {
    await fetch('/api/store-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    });
    return true;
  } catch (e) {
    console.warn('Server products sync error:', e);
    return false;
  }
}

/**
 * Loads store profile, settings and products from LocalStorage and synchronizes with the server.
 */
export async function loadInitialStoreProfile(): Promise<{
  business: BusinessInfo | null;
  settings: CatalogSettings | null;
  products: Product[] | null;
  lastSaved: string | null;
}> {
  let localBusiness: BusinessInfo | null = null;
  let localSettings: CatalogSettings | null = null;
  let localProducts: Product[] | null = null;
  const lastSaved = localStorage.getItem('store_profile_last_saved');

  try {
    const bRaw = localStorage.getItem(STORAGE_KEY_BUSINESS);
    if (bRaw) localBusiness = JSON.parse(bRaw);

    const sRaw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (sRaw) localSettings = JSON.parse(sRaw);

    const pRaw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (pRaw) {
      const parsed = JSON.parse(pRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localProducts = parsed;
      }
    }
  } catch (e) {
    console.error('Error parsing localStorage profile:', e);
  }

  // Try fetching from server
  try {
    const res = await fetch('/api/store-profile');
    if (res.ok) {
      const data = await res.json();
      if (data.profile) {
        return {
          business: data.profile.business ? { ...localBusiness, ...data.profile.business } : localBusiness,
          settings: data.profile.settings ? { ...localSettings, ...data.profile.settings } : localSettings,
          products: (Array.isArray(data.profile.products) && data.profile.products.length > 0)
            ? data.profile.products
            : localProducts,
          lastSaved: data.profile.updatedAt || lastSaved,
        };
      }
    }
  } catch (err) {
    console.debug('Server profile check:', err);
  }

  return {
    business: localBusiness,
    settings: localSettings,
    products: localProducts,
    lastSaved,
  };
}
