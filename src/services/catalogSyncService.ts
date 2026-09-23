import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';
import { Catalog, Product, BusinessInfo, CatalogSettings, Seller } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

const STORAGE_CATALOG_PREFIX = 'cloud_catalog_';

/**
 * Normalizes a seller identifier into a standard document ID for Firestore
 */
export function getSellerCatalogDocId(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `catalog_${clean}`;
}

/**
 * Saves a seller's full catalog (products, business info, settings) to Cloud Firestore.
 * This guarantees real-time sync across any device (PC, phone, tablet).
 */
export async function saveSellerCatalogToFirestore(
  seller: { id: string; username: string; storeName?: string; name?: string },
  catalogData: {
    products: Product[];
    business: BusinessInfo;
    settings: CatalogSettings;
    id?: string;
  }
): Promise<{ success: boolean; catalogId: string }> {
  const docId = getSellerCatalogDocId(seller.username);
  const catalogPayload: Catalog = {
    id: docId,
    sellerId: seller.id,
    business: {
      ...catalogData.business,
      name: catalogData.business.name || seller.storeName || seller.name || 'Mi Tienda',
    },
    settings: catalogData.settings,
    products: catalogData.products || [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  // 1. Save to Cloud Firestore
  try {
    const catalogRef = doc(db, 'catalogs', docId);
    await setDoc(catalogRef, catalogPayload, { merge: true });
    console.log(`[Firestore] Catálogo '${docId}' guardado exitosamente en la nube.`);
  } catch (error) {
    console.warn('[Firestore] Error al escribir en Firestore, usando respaldo:', error);
    try {
      handleFirestoreError(error, OperationType.WRITE, `catalogs/${docId}`);
    } catch (e) {
      // Allow fallback to proceed
    }
  }

  // 2. Cache in LocalStorage for instant offline availability
  try {
    localStorage.setItem(`${STORAGE_CATALOG_PREFIX}${docId}`, JSON.stringify(catalogPayload));
  } catch (e) {
    console.warn('[SyncService] LocalStorage warning:', e);
  }

  return { success: true, catalogId: docId };
}

/**
 * Loads a seller's catalog from Cloud Firestore.
 * Checks Firestore first, then backend API, then localStorage fallback.
 */
export async function loadSellerCatalogFromFirestore(
  seller: { id: string; username: string }
): Promise<Catalog | null> {
  const docId = getSellerCatalogDocId(seller.username);

  // 1. Try Cloud Firestore (Primary cross-device source of truth)
  try {
    const catalogRef = doc(db, 'catalogs', docId);
    const snap = await getDoc(catalogRef);
    if (snap.exists()) {
      const data = snap.data() as Catalog;
      console.log(`[Firestore] Catálogo cargado desde la nube para ${seller.username}:`, data.products?.length, 'productos');
      // Update local cache
      try {
        localStorage.setItem(`${STORAGE_CATALOG_PREFIX}${docId}`, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (error) {
    console.warn('[Firestore] Lectura de catálogo desde la nube con advertencia:', error);
  }

  // 2. Try LocalStorage Cache
  try {
    const cached = localStorage.getItem(`${STORAGE_CATALOG_PREFIX}${docId}`);
    if (cached) {
      return JSON.parse(cached) as Catalog;
    }
  } catch (e) {
    console.warn('[SyncService] LocalStorage read error:', e);
  }

  return null;
}

/**
 * Subscribes to real-time changes in Cloud Firestore for the seller's catalog.
 * Any update made from another smartphone or computer updates this screen in real-time!
 */
export function subscribeToSellerCatalog(
  username: string,
  onUpdate: (catalog: Catalog) => void
): Unsubscribe {
  const docId = getSellerCatalogDocId(username);
  const catalogRef = doc(db, 'catalogs', docId);

  return onSnapshot(
    catalogRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Catalog;
        onUpdate(data);
      }
    },
    (error) => {
      console.warn('[Firestore] Error en snapshot listener:', error);
    }
  );
}

/**
 * Loads a customer catalog by catalogId (Firestore or API)
 */
export async function loadPublicCatalog(catalogId: string): Promise<Catalog | null> {
  try {
    const cleanId = catalogId.trim();
    const docRef = doc(db, 'catalogs', cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Catalog;
    }
  } catch (err) {
    console.warn('[Firestore] Fallback para catálogo público:', err);
  }

  // Fallback to API
  try {
    const res = await fetch(`/api/catalogs/${catalogId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[API] Error al cargar catálogo público:', err);
  }

  return null;
}
