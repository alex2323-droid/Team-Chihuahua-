import React, { useState, useEffect, useRef } from 'react';
import { BusinessInfo, CatalogSettings, Product, Catalog } from './types';
import BusinessSettings from './components/BusinessSettings';
import ProductUploader from './components/ProductUploader';
import ProductList from './components/ProductList';
import CatalogPreview from './components/CatalogPreview';
import PdfExportModal from './components/PdfExportModal';
import SellerPortal from './components/SellerPortal';
import { useAuth } from './context/AuthContext';
import { loadInitialStoreProfile, saveStoreProfile } from './utils/storeProfile';
import './firebase';
import {
  saveSellerCatalogToFirestore,
  loadSellerCatalogFromFirestore,
  subscribeToSellerCatalog,
  loadPublicCatalog,
  getSellerCatalogDocId,
} from './services/catalogSyncService';
import {
  Sparkles,
  Share2,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Eye,
  Settings,
  Grid,
  FileSpreadsheet,
  PlusCircle,
  HelpCircle,
  ShoppingBag,
  X,
  FileDown,
  Printer,
  Moon,
  Sun,
  Store,
  Upload,
  Package,
  LogOut,
  User,
  ShieldCheck,
  CheckCircle2,
  Cloud,
  CloudCheck,
  Save,
  AlertCircle,
} from 'lucide-react';

const DEFAULT_BUSINESS: BusinessInfo = {
  name: 'Boutique Bella Vista',
  whatsapp: '34600123456', // standard format
  instagram: 'boutique_bellavista',
  address: 'Calle Mayor 12, Madrid',
  paymentMethods: ['Efectivo', 'Transferencia Bancaria'],
  additionalInfo: 'Envíos a domicilio en 24 horas hábiles. Envíos gratis por compras superiores a €50.',
};

const DEFAULT_SETTINGS: CatalogSettings = {
  primaryColor: '#111827', // Charcoal Black
  secondaryColor: '#3B82F6',
  theme: 'light',
  darkMode: false,
  currency: 'EUR',
  layout: 'grid',
  showSku: true,
  showAttributes: true,
};

const PRESET_PRODUCTS: Product[] = [
  {
    id: 'preset-1',
    name: 'Zapatillas Deportivas Running Blancas',
    price: 65.00,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
    description: 'Calzado deportivo de alta resistencia con amortiguación premium. Ideal para asfalto.',
    category: 'Calzado',
    imageAnalysisStatus: 'completed',
    attributes: {
      sku: 'RUN-A91B',
      colors: ['Blanco', 'Rojo'],
      sizes: ['39', '40', '41', '42'],
      brand: 'AeroMax',
      features: ['Suela antideslizante', 'Material transpirable'],
      availability: 'Disponible',
    },
  },
  {
    id: 'preset-2',
    name: 'Gafas de Sol Clásicas Negras',
    price: 24.99,
    imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80',
    description: 'Lentes polarizados con protección UV400 completa. Marco ligero y duradero.',
    category: 'Accesorios',
    imageAnalysisStatus: 'completed',
    attributes: {
      sku: 'SUN-C10',
      colors: ['Negro Brillante', 'Mate'],
      sizes: ['Estándar'],
      brand: 'SolarLux',
      features: ['Protección UV400', 'Incluye estuche rígido'],
      availability: 'Disponible',
    },
  },
  {
    id: 'preset-3',
    name: 'Mochila Urbana Impermeable',
    price: 45.50,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
    description: 'Compartimento acolchado para laptop de hasta 15.6 pulgadas. Material repelente al agua.',
    category: 'Accesorios',
    imageAnalysisStatus: 'completed',
    attributes: {
      sku: 'BAG-W23',
      colors: ['Gris Oxford', 'Azul Marino'],
      sizes: ['25 Litros'],
      features: ['Puerto de carga USB externo', 'Bolsillo antirrobo'],
      availability: 'Bajo pedido',
    },
  },
];

type MobileTab = 'store' | 'upload' | 'products' | 'preview';

export default function App() {
  const { seller, token, isLoading: isAuthLoading, logout } = useAuth();

  const [business, setBusiness] = useState<BusinessInfo>(DEFAULT_BUSINESS);
  const [settings, setSettings] = useState<CatalogSettings>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<Product[]>(PRESET_PRODUCTS);

  // App mode states
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [mobileTab, setMobileTab] = useState<MobileTab>('products');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isCustomerView, setIsCustomerView] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Persistence & Save status states
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('saved');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCatalogLoadedForSeller, setIsCatalogLoadedForSeller] = useState(false);
  const isInitialMount = useRef(true);
  const lastSavedTimestampRef = useRef<number>(Date.now());

  // Share Modal / Deployed link state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCatalogId, setSavedCatalogId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper to persist the seller's catalog in Cloud Firestore and backend
  const syncSellerCatalogToBackend = async (
    targetProducts: Product[],
    targetBusiness: BusinessInfo,
    targetSettings: CatalogSettings,
    customCatalogId?: string
  ) => {
    if (!seller || isCustomerView) return;

    setSaveStatus('saving');
    lastSavedTimestampRef.current = Date.now();
    try {
      // 1. Primary Sync: Cloud Firestore (guarantees cross-device availability)
      const firestoreResult = await saveSellerCatalogToFirestore(seller, {
        products: targetProducts,
        business: targetBusiness,
        settings: targetSettings,
        id: customCatalogId || savedCatalogId || undefined,
      });

      if (firestoreResult.catalogId) {
        setSavedCatalogId(firestoreResult.catalogId);
      }

      // 2. Secondary Sync: Backend API (if available)
      if (token) {
        fetch('/api/seller/catalog', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: customCatalogId || savedCatalogId || firestoreResult.catalogId,
            products: targetProducts,
            business: targetBusiness,
            settings: targetSettings,
          }),
        }).catch((err) => console.warn('[App] Backend sync note:', err));
      }

      setSaveStatus('saved');
    } catch (err) {
      console.error('[App] Error al guardar en la nube:', err);
      setSaveStatus('saved'); // Keep functional for user
    }
  };

  // Global Tailwind dark mode sync on document root
  const isDarkMode = Boolean(
    settings.darkMode ||
    settings.theme === 'dark' ||
    settings.theme === 'premium'
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Toggle Dark Theme Helper
  const toggleDarkMode = () => {
    const nextDarkState = !isDarkMode;
    setSettings((prev) => ({
      ...prev,
      darkMode: nextDarkState,
      theme: nextDarkState ? 'dark' : 'light',
    }));
  };

  // 1. Listen for query parameter on load (Customer direct storefront)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const catalogId = params.get('id');
    if (catalogId) {
      loadCatalogFromDb(catalogId);
    }
  }, []);

  // 2. Load Seller's own catalog from Cloud Firestore & subscribe to live updates
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) return; // Customer view

    if (!seller) {
      setIsCatalogLoadedForSeller(false);
      return;
    }

    let unsubscribeFirestore: (() => void) | null = null;

    const fetchSellerCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        // Step A: Load from Cloud Firestore first (Cross-device primary)
        const cloudCatalog = await loadSellerCatalogFromFirestore(seller);

        if (cloudCatalog) {
          if (Array.isArray(cloudCatalog.products) && cloudCatalog.products.length > 0) {
            setProducts(cloudCatalog.products);
          }
          if (cloudCatalog.business) {
            setBusiness((prev) => ({
              ...prev,
              ...cloudCatalog.business,
              name: cloudCatalog.business.name || seller.storeName || prev.name,
            }));
          }
          if (cloudCatalog.settings) {
            setSettings((prev) => ({ ...prev, ...cloudCatalog.settings }));
          }
          if (cloudCatalog.id) {
            setSavedCatalogId(cloudCatalog.id);
          }
          setSaveStatus('saved');
        } else {
          // Step B: Fallback to Backend API if not yet in Firestore
          if (token) {
            try {
              const response = await fetch('/api/seller/catalog', {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (response.ok) {
                const data = await response.json();
                if (data.catalog) {
                  const cat = data.catalog;
                  if (Array.isArray(cat.products) && cat.products.length > 0) {
                    setProducts(cat.products);
                  }
                  if (cat.business) {
                    setBusiness((prev) => ({
                      ...prev,
                      ...cat.business,
                      name: cat.business.name || seller.storeName || prev.name,
                    }));
                  }
                  if (cat.settings) {
                    setSettings((prev) => ({ ...prev, ...cat.settings }));
                  }
                  if (cat.id) {
                    setSavedCatalogId(cat.id);
                  }
                  // Save into Cloud Firestore to establish cross-device link
                  syncSellerCatalogToBackend(
                    cat.products || PRESET_PRODUCTS,
                    cat.business || DEFAULT_BUSINESS,
                    cat.settings || DEFAULT_SETTINGS,
                    cat.id
                  );
                }
              }
            } catch (apiErr) {
              console.warn('[App] API fallback notice:', apiErr);
            }
          }
        }

        // Step C: Subscribe to Real-Time Cloud Firestore Updates (Live cross-device sync)
        unsubscribeFirestore = subscribeToSellerCatalog(seller.username, (liveData) => {
          if (liveData) {
            const liveTime = liveData.updatedAt ? new Date(liveData.updatedAt).getTime() : 0;
            // Only accept remote update if it is strictly from another device and newer
            if (liveTime > lastSavedTimestampRef.current + 2500) {
              if (Array.isArray(liveData.products) && liveData.products.length > 0) {
                setProducts(liveData.products);
              }
              if (liveData.business) {
                setBusiness((prev) => ({ ...prev, ...liveData.business }));
              }
              if (liveData.settings) {
                setSettings((prev) => ({ ...prev, ...liveData.settings }));
              }
              if (liveData.id) {
                setSavedCatalogId(liveData.id);
              }
              setSaveStatus('saved');
            }
          }
        });
      } catch (err) {
        console.error('[App] Error al cargar catálogo de vendedor:', err);
      } finally {
        setIsLoadingCatalog(false);
        setIsCatalogLoadedForSeller(true);
        isInitialMount.current = false;
      }
    };

    fetchSellerCatalog();

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, [seller?.id, seller?.username, token]);

  // 3. Debounced Auto-Save for changes made in editor (Saves straight to Cloud Firestore)
  useEffect(() => {
    if (isInitialMount.current || !isCatalogLoadedForSeller || !seller || isCustomerView) {
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      syncSellerCatalogToBackend(products, business, settings);
    }, 600);

    return () => clearTimeout(timer);
  }, [products, business, settings, isCatalogLoadedForSeller]);

  // Load customer catalog function with Cloud Firestore support
  const loadCatalogFromDb = async (id: string) => {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      // 1. Try Cloud Firestore
      const publicDoc = await loadPublicCatalog(id);
      if (publicDoc) {
        setBusiness(publicDoc.business);
        setSettings(publicDoc.settings);
        setProducts(publicDoc.products);
        setIsCustomerView(true);
        return;
      }

      // 2. Fallback to API
      const response = await fetch(`/api/catalogs/${id}`);
      if (!response.ok) {
        throw new Error('No se pudo encontrar el catálogo solicitado.');
      }
      const data: Catalog = await response.json();
      setBusiness(data.business);
      setSettings(data.settings);
      setProducts(data.products);
      setIsCustomerView(true);
    } catch (error: any) {
      console.error('Error loading catalog:', error);
      setCatalogError(error.message || 'Catálogo no encontrado.');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Called when new product(s) are uploaded from file, camera, URL, or form
  const handleProductsUploaded = (newProducts: Product[]) => {
    setProducts((prev) => {
      const current = [...prev];
      newProducts.forEach((item) => {
        const index = current.findIndex((p) => p.id === item.id);
        if (index > -1) {
          current[index] = item;
        } else {
          current.unshift(item);
        }
      });

      // Save directly to seller's catalog in backend
      syncSellerCatalogToBackend(current, business, settings);
      return current;
    });

    const count = newProducts.length;
    showToast(count === 1 ? '✓ Producto guardado en tu catálogo de vendedor' : `✓ ${count} productos guardados en tu catálogo`);
    setMobileTab('products');
  };

  const handleSaveAndPublish = async () => {
    if (!business.name || !business.whatsapp) {
      alert('Por favor, completa el nombre del negocio y el número de WhatsApp para poder continuar.');
      setMobileTab('store');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/catalogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: savedCatalogId || undefined,
          business,
          settings,
          products,
        }),
      });

      if (!response.ok) {
        throw new Error('Error de servidor al guardar catálogo.');
      }

      const data = await response.json();
      setSavedCatalogId(data.id);
      setSaveStatus('saved');
      setIsShareModalOpen(true);
      showToast('✓ Catálogo guardado y listo para compartir');
    } catch (error: any) {
      console.error('Error saving catalog:', error);
      alert('Ocurrió un error al guardar tu catálogo en el servidor. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const shareUrl = savedCatalogId
    ? `${window.location.origin}${window.location.pathname}?id=${savedCatalogId}`
    : '';

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Enlace copiado al portapapeles');
    }
  };

  const handleShareToWhatsApp = () => {
    if (shareUrl) {
      const text = `¡Hola! Te comparto mi catálogo digital interactivo de ${business.name}. Puedes ver mis productos y hacer tu pedido directamente desde aquí: ${shareUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // RENDER CUSTOMER STANDALONE VIEW (Customers view catalogs directly without needing to log in)
  if (isCustomerView) {
    if (isLoadingCatalog) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-neutral-900 dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">Cargando catálogo...</p>
          </div>
        </div>
      );
    }

    if (catalogError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-black px-4 text-center">
          <div className="max-w-md bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 space-y-4">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center rounded-full mx-auto font-bold text-xl">
              !
            </div>
            <h2 className="text-lg font-bold text-neutral-800 dark:text-white">Catálogo No Disponible</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{catalogError}</p>
            <a
              href={window.location.origin + window.location.pathname}
              className="inline-block bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
              Crear Nuevo Catálogo
            </a>
          </div>
        </div>
      );
    }

    return (
      <CatalogPreview
        business={business}
        settings={settings}
        products={products}
        isCustomerView={true}
      />
    );
  }

  // AUTHENTICATION CHECK FOR SELLERS ONLY
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-neutral-900 dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">Verificando sesión de vendedor...</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return <SellerPortal />;
  }

  // RENDER CREATOR DASHBOARD FOR AUTHENTICATED SELLERS
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex flex-col font-sans transition-colors duration-200 pb-20 lg:pb-0" id="creator-dashboard-root">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-neutral-900 dark:bg-white text-white dark:text-black px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200 border border-neutral-700/40 dark:border-neutral-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar Optimized for Smartphone & Desktop */}
      <header className="bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40 px-3 sm:px-4 py-2.5 sm:py-3 shadow-2xs pt-safe">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="bg-neutral-900 dark:bg-white p-2 rounded-xl text-white dark:text-black shadow-sm shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white tracking-tight truncate">
                {business.name || seller.storeName || 'Catálogo Inteligente'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 font-medium truncate">
                  Panel de Vendedor • @{seller.username}
                </p>
                {/* Cloud Multi-Device Auto-save Status Indicator */}
                <button
                  type="button"
                  onClick={() => {
                    syncSellerCatalogToBackend(products, business, settings);
                    showToast('✓ Catálogo sincronizado en la nube (Multidispositivo)');
                  }}
                  className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-800 transition"
                  title="Guardado automáticamente en la nube. Haz clic para sincronizar ahora."
                >
                  {saveStatus === 'saving' ? (
                    <span className="text-blue-500 flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      <span>Guardando en la nube...</span>
                    </span>
                  ) : saveStatus === 'saved' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>Sincronizado en la nube ✓</span>
                    </span>
                  ) : (
                    <span className="text-amber-500 flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" />
                      <span>Guardar cambios</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile, mobile uses bottom bar) */}
          <div className="hidden lg:flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200/50 dark:border-neutral-800">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Configuración y Carga
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Vista Previa
            </button>
          </div>

          {/* Action Buttons & Seller Profile in Header */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Seller Account Badge */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs">
              <div className="w-5 h-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-[10px] shrink-0">
                {seller.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left leading-tight">
                <span className="font-bold text-neutral-900 dark:text-white block text-[11px] truncate max-w-[120px]">
                  {seller.name}
                </span>
                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 block truncate max-w-[120px]">
                  {seller.storeName || `@${seller.username}`}
                </span>
              </div>
            </div>

            {/* Dark Mode Quick Switcher */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl border transition flex items-center justify-center min-w-[36px] min-h-[36px] ${
                isDarkMode
                  ? 'bg-neutral-900 hover:bg-neutral-800 text-yellow-400 border-neutral-800'
                  : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200'
              }`}
              title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro (Negro y Blanco)'}
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-neutral-600" />}
            </button>

            {/* PDF Export Button */}
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold px-2.5 sm:px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1.5 shadow-2xs min-h-[36px]"
              title="Exportar catálogo en PDF"
            >
              <FileDown className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Save and Publish Button */}
            <button
              onClick={handleSaveAndPublish}
              disabled={isSaving}
              className="bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black text-xs font-bold px-3 sm:px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5 shadow min-h-[36px] active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="hidden sm:inline">Guardando...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xs:inline">Compartir</span>
                </>
              )}
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => logout()}
              className="bg-white hover:bg-red-50 dark:bg-neutral-900 dark:hover:bg-red-950/30 text-neutral-600 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 border border-neutral-200 dark:border-neutral-800 p-2 rounded-xl transition shadow-2xs min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={`Cerrar sesión de ${seller.name} (@${seller.username})`}
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6">
        {/* DESKTOP LAYOUT (>= 1024px) */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-start">
          <div className={`lg:col-span-7 space-y-6 ${activeTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
            <BusinessSettings
              business={business}
              setBusiness={setBusiness}
              settings={settings}
              setSettings={setSettings}
            />

            <ProductUploader
              onProductsUploaded={handleProductsUploaded}
              currency={settings.currency}
            />

            <ProductList
              products={products}
              setProducts={setProducts}
              currency={settings.currency}
            />
          </div>

          <div className={`lg:col-span-5 ${activeTab === 'preview' ? 'block' : 'hidden lg:block lg:sticky lg:top-20'}`}>
            <CatalogPreview
              business={business}
              settings={settings}
              products={products}
              isCustomerView={false}
            />
          </div>
        </div>

        {/* SMARTPHONE / MOBILE SCREEN CONTENT (< 1024px) */}
        <div className="block lg:hidden space-y-4">
          {mobileTab === 'store' && (
            <div className="animate-in fade-in duration-150">
              <BusinessSettings
                business={business}
                setBusiness={setBusiness}
                settings={settings}
                setSettings={setSettings}
              />
            </div>
          )}

          {mobileTab === 'upload' && (
            <div className="animate-in fade-in duration-150">
              <ProductUploader
                onProductsUploaded={handleProductsUploaded}
                currency={settings.currency}
              />
            </div>
          )}

          {mobileTab === 'products' && (
            <div className="animate-in fade-in duration-150 space-y-4">
              <ProductList
                products={products}
                setProducts={setProducts}
                currency={settings.currency}
              />
            </div>
          )}

          {mobileTab === 'preview' && (
            <div className="animate-in fade-in duration-150">
              <CatalogPreview
                business={business}
                settings={settings}
                products={products}
                isCustomerView={false}
              />
            </div>
          )}
        </div>
      </main>

      {/* FOOTER DESKTOP */}
      <footer className="hidden lg:block bg-white dark:bg-[#0a0a0a] border-t border-neutral-100 dark:border-neutral-900 py-4 mt-12 text-center text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
        Generador de Catálogos de Productos &copy; {new Date().getFullYear()} • Modo Smartphone, Dark Negro y Blanco & IA.
      </footer>

      {/* SMARTPHONE FIXED BOTTOM NAVIGATION BAR */}
      <nav
        id="mobile-bottom-nav"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800 pb-safe lg:hidden shadow-lg transition-colors"
      >
        <div className="grid grid-cols-4 items-center h-14">
          {/* Tab 1: Tienda */}
          <button
            type="button"
            onClick={() => setMobileTab('store')}
            className={`flex flex-col items-center justify-center h-full transition relative ${
              mobileTab === 'store'
                ? 'text-neutral-950 dark:text-white font-bold'
                : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {mobileTab === 'store' && (
              <span className="absolute top-0 inset-x-4 h-0.5 bg-neutral-950 dark:bg-white rounded-full" />
            )}
            <Store className="w-4 h-4" />
            <span className="text-[10px] mt-1 tracking-tight">Tienda</span>
          </button>

          {/* Tab 2: Cargar */}
          <button
            type="button"
            onClick={() => setMobileTab('upload')}
            className={`flex flex-col items-center justify-center h-full transition relative ${
              mobileTab === 'upload'
                ? 'text-neutral-950 dark:text-white font-bold'
                : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {mobileTab === 'upload' && (
              <span className="absolute top-0 inset-x-4 h-0.5 bg-neutral-950 dark:bg-white rounded-full" />
            )}
            <Upload className="w-4 h-4" />
            <span className="text-[10px] mt-1 tracking-tight">Cargar</span>
          </button>

          {/* Tab 3: Productos */}
          <button
            type="button"
            onClick={() => setMobileTab('products')}
            className={`flex flex-col items-center justify-center h-full transition relative ${
              mobileTab === 'products'
                ? 'text-neutral-950 dark:text-white font-bold'
                : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {mobileTab === 'products' && (
              <span className="absolute top-0 inset-x-4 h-0.5 bg-neutral-950 dark:bg-white rounded-full" />
            )}
            <div className="relative">
              <Package className="w-4 h-4" />
              {products.length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center shadow-xs">
                  {products.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Productos</span>
          </button>

          {/* Tab 4: Vista Previa */}
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex flex-col items-center justify-center h-full transition relative ${
              mobileTab === 'preview'
                ? 'text-neutral-950 dark:text-white font-bold'
                : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {mobileTab === 'preview' && (
              <span className="absolute top-0 inset-x-4 h-0.5 bg-neutral-950 dark:bg-white rounded-full" />
            )}
            <Eye className="w-4 h-4" />
            <span className="text-[10px] mt-1 tracking-tight">Ver Tienda</span>
          </button>
        </div>
      </nav>

      {/* SHARE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0e0e10] text-neutral-900 dark:text-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-neutral-100 dark:border-neutral-800 relative space-y-4 pb-safe sm:pb-6">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 pt-2 sm:pt-0">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-800 dark:text-white">¡Catálogo Publicado!</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                Tu catálogo interactivo está listo para ser compartido por WhatsApp o redes sociales.
              </p>
            </div>

            {/* Link Box */}
            <div className="bg-neutral-50 dark:bg-black/50 border border-neutral-100 dark:border-neutral-800 rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Link de Acceso Clientes</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300 px-3 py-2 rounded-lg flex-1 outline-none font-mono truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-semibold px-3 py-2 rounded-lg transition inline-flex items-center gap-1.5 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleShareToWhatsApp}
                className="bg-green-600 hover:bg-green-500 text-white font-semibold text-xs py-3 px-4 rounded-xl transition inline-flex items-center justify-center gap-1.5 shadow active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                WhatsApp
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs py-3 px-4 rounded-xl transition inline-flex items-center justify-center gap-1.5 active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Catálogo
              </a>
            </div>

            {/* Offline / Physical Print PDF Option */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => {
                  setSavedCatalogId(null);
                  setIsPdfModalOpen(true);
                }}
                className="w-full bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 transition inline-flex items-center justify-center gap-2"
              >
                <FileDown className="w-4 h-4 text-blue-500" />
                Descargar Catálogo en PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exportación a PDF */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        business={business}
        settings={settings}
        products={products}
      />
    </div>
  );
}
