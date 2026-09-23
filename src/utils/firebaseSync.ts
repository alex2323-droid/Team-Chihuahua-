import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Catalog } from '../types';

/**
 * Registers a new seller in Firestore
 */
export async function registerSeller(username: string, password?: string): Promise<Catalog> {
  const cleanUsername = username.trim().toLowerCase();
  const sellerRef = doc(db, 'sellers', cleanUsername);
  const docSnap = await getDoc(sellerRef);

  if (docSnap.exists()) {
    throw new Error('El nombre de usuario ya está registrado.');
  }

  const catalogId = "CAT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  const defaultCatalog: Catalog = {
    id: catalogId,
    business: {
      name: username.trim() + " Store",
      whatsapp: "",
      paymentMethods: ["Efectivo"],
      additionalInfo: "Envíos a domicilio disponibles. Consulta formas de pago."
    },
    settings: {
      primaryColor: "#000000",
      secondaryColor: "#ffffff",
      theme: "dark",
      currency: "EUR",
      layout: "grid",
      showSku: true,
      showAttributes: true
    },
    products: [],
    createdAt: new Date().toISOString()
  };

  await setDoc(sellerRef, {
    username: cleanUsername,
    password: password || '',
    catalog: defaultCatalog,
    createdAt: new Date().toISOString()
  });

  return defaultCatalog;
}

/**
 * Logs in an existing seller from Firestore
 */
export async function loginSeller(username: string, password?: string): Promise<Catalog> {
  const cleanUsername = username.trim().toLowerCase();
  const sellerRef = doc(db, 'sellers', cleanUsername);
  const docSnap = await getDoc(sellerRef);

  if (!docSnap.exists()) {
    throw new Error('Usuario o contraseña incorrectos.');
  }

  const data = docSnap.data();
  if (data.password !== (password || '')) {
    throw new Error('Usuario o contraseña incorrectos.');
  }

  return data.catalog as Catalog;
}

/**
 * Saves/Updates the seller's catalog in Firestore
 */
export async function saveSellerCatalog(username: string, catalog: any): Promise<void> {
  const cleanUsername = username.trim().toLowerCase();
  const sellerRef = doc(db, 'sellers', cleanUsername);
  
  await setDoc(sellerRef, {
    catalog: catalog,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Loads a public catalog by catalogId
 */
export async function getPublicCatalog(catalogId: string): Promise<Catalog> {
  const catalogRef = doc(db, 'catalogs', catalogId);
  const docSnap = await getDoc(catalogRef);
  if (!docSnap.exists()) {
    throw new Error('No se pudo encontrar el catálogo solicitado.');
  }
  return docSnap.data() as Catalog;
}

/**
 * Saves/Updates a public catalog in Firestore
 */
export async function savePublicCatalog(catalogId: string, catalog: any): Promise<void> {
  const catalogRef = doc(db, 'catalogs', catalogId);
  await setDoc(catalogRef, {
    ...catalog,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}
