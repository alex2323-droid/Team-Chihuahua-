import { BusinessInfo, CatalogSettings } from '../types';

const STORAGE_KEY_BUSINESS = 'saved_store_business';
const STORAGE_KEY_SETTINGS = 'saved_catalog_settings';

/**
 * Compresses an image file (e.g. logo) to a maximum dimension of 360px on an HTML5 canvas.
 * Produces a lightweight Base64 string (< 80KB) ideal for local storage and fast rendering.
 */
export async function compressLogoImage(file: File, maxDimension = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Error al decodificar la imagen'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let w = img.width || 300;
          let h = img.height || 300;

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

          // Use PNG if transparent or JPEG with 0.88 quality
          const isPng = file.type === 'image/png';
          const format = isPng ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(format, 0.88);
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
 * Saves business profile and catalog settings to both localStorage and the backend server.
 */
export async function saveStoreProfile(
  business: BusinessInfo,
  settings: CatalogSettings
): Promise<{ success: boolean; message: string }> {
  // 1. Save immediately to LocalStorage for instant offline persistence
  try {
    localStorage.setItem(STORAGE_KEY_BUSINESS, JSON.stringify(business));
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    localStorage.setItem('store_profile_last_saved', new Date().toISOString());
  } catch (lsErr) {
    console.warn('[StoreProfile] localStorage save warning:', lsErr);
  }

  // 2. Persist to backend server API
  try {
    const res = await fetch('/api/store-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business, settings }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Error al guardar en el servidor');
    }

    return {
      success: true,
      message: '¡Configuración, contactos y logo guardados con éxito!',
    };
  } catch (serverErr: any) {
    console.warn('[StoreProfile] Server save warning:', serverErr.message);
    // Still considered success if saved to localStorage
    return {
      success: true,
      message: 'Configuración guardada en tu navegador.',
    };
  }
}

/**
 * Loads store profile and settings from LocalStorage and synchronizes with the server.
 */
export async function loadInitialStoreProfile(): Promise<{
  business: BusinessInfo | null;
  settings: CatalogSettings | null;
  lastSaved: string | null;
}> {
  let localBusiness: BusinessInfo | null = null;
  let localSettings: CatalogSettings | null = null;
  const lastSaved = localStorage.getItem('store_profile_last_saved');

  try {
    const bRaw = localStorage.getItem(STORAGE_KEY_BUSINESS);
    if (bRaw) localBusiness = JSON.parse(bRaw);

    const sRaw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (sRaw) localSettings = JSON.parse(sRaw);
  } catch (e) {
    console.error('Error parsing localStorage profile:', e);
  }

  // Try fetching from server
  try {
    const res = await fetch('/api/store-profile');
    if (res.ok) {
      const data = await res.json();
      if (data.profile?.business) {
        return {
          business: { ...localBusiness, ...data.profile.business },
          settings: { ...localSettings, ...data.profile.settings },
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
    lastSaved,
  };
}
