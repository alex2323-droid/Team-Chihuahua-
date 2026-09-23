import React, { useState, useEffect } from 'react';
import { BusinessInfo, CatalogSettings, Product, Catalog } from './types';
import BusinessSettings from './components/BusinessSettings';
import ProductUploader from './components/ProductUploader';
import ProductList from './components/ProductList';
import CatalogPreview from './components/CatalogPreview';
import PdfExportModal from './components/PdfExportModal';
import SellerAuthModal from './components/SellerAuthModal';
import { saveSellerCatalog, getPublicCatalog, savePublicCatalog } from './utils/firebaseSync';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
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
  User,
  LogOut,
  Lock,
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
  primaryColor: '#000000', // Default negro
  secondaryColor: '#ffffff', // Default blanco
  theme: 'dark', // Dark mode por defecto
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

export default function App() {
  const [business, setBusiness] = useState<BusinessInfo>(DEFAULT_BUSINESS);
  const [settings, setSettings] = useState<CatalogSettings>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<Product[]>([]);

  // Authentication states
  const [currentSeller, setCurrentSeller] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // App mode states
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isCustomerView, setIsCustomerView] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Share Modal / Deployed link state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCatalogId, setSavedCatalogId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const catalogId = params.get('id');

    if (catalogId) {
      loadCatalogFromDb(catalogId);
    } else {
      // Check for logged-in seller session
      const savedSeller = localStorage.getItem('seller_username');
      if (savedSeller) {
        setCurrentSeller(savedSeller);
        loadSellerCatalog(savedSeller);
      } else {
        // Load local fallback catalog data
        const localData = localStorage.getItem('local_catalog_data');
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (parsed.business) setBusiness(parsed.business);
            if (parsed.settings) setSettings(parsed.settings);
            if (parsed.products) {
              setProducts(parsed.products);
            } else {
              setProducts(PRESET_PRODUCTS);
            }
            if (parsed.catalogId) setSavedCatalogId(parsed.catalogId);
          } catch (e) {
            console.error('Error parsing local catalog:', e);
            setProducts(PRESET_PRODUCTS);
          }
        } else {
          // Absolute fallback
          setProducts(PRESET_PRODUCTS);
        }
      }
    }
  }, []);

  // Sync / Apply theme classes globally to the <html> root element
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Debounced auto-saving of changes to persistent storage (local or cloud)
  useEffect(() => {
    if (isCustomerView) return;

    // Save to local storage for quick reload recovery
    localStorage.setItem(
      'local_catalog_data',
      JSON.stringify({ business, settings, products, catalogId: savedCatalogId })
    );

    // If logged in as seller, auto-sync back-to-back to cloud (Firebase Firestore)
    if (currentSeller) {
      const delayDebounce = setTimeout(async () => {
        try {
          const finalCatalogId = savedCatalogId || `CAT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
          if (!savedCatalogId) {
            setSavedCatalogId(finalCatalogId);
          }
          const catalogObj = {
            id: finalCatalogId,
            business,
            settings,
            products,
          };
          await saveSellerCatalog(currentSeller, catalogObj);
          await savePublicCatalog(finalCatalogId, catalogObj);
          console.log('[Cloud] Autoguardado exitoso en Firebase.');
        } catch (err) {
          console.error('Error auto-guardando en Firebase:', err);
        }
      }, 1500); // 1.5s debounce to minimize network overhead while typing
      return () => clearTimeout(delayDebounce);
    }
  }, [business, settings, products, currentSeller, savedCatalogId, isCustomerView]);

  const loadCatalogFromDb = async (id: string) => {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      const data = await getPublicCatalog(id);
      setBusiness(data.business);
      setSettings(data.settings);
      setProducts(data.products || []);
      setIsCustomerView(true); // Direct customer presentation mode
    } catch (error: any) {
      console.error('Error loading catalog:', error);
      setCatalogError(error.message || 'Catálogo no encontrado.');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const loadSellerCatalog = async (username: string) => {
    setIsLoadingCatalog(true);
    try {
      const cleanUsername = username.trim().toLowerCase();
      const sellerRef = doc(db, 'sellers', cleanUsername);
      const docSnap = await getDoc(sellerRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const cat = data.catalog;
        if (cat) {
          setBusiness(cat.business);
          setSettings(cat.settings);
          setProducts(cat.products || []);
          setSavedCatalogId(cat.id);
        }
      }
    } catch (err) {
      console.error('Error al recuperar catálogo del vendedor:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handleProductsUploaded = (newProducts: Product[]) => {
    setProducts((prev) => {
      const current = [...prev];
      newProducts.forEach((item) => {
        const index = current.findIndex((p) => p.id === item.id);
        if (index > -1) {
          current[index] = item;
        } else {
          current.push(item);
        }
      });
      return current;
    });
  };

  const handleSaveAndPublish = async () => {
    if (!business.name) {
      alert('Por favor, completa el nombre de tu negocio para poder guardar.');
      return;
    }

    setIsSaving(true);
    try {
      const finalCatalogId = savedCatalogId || `CAT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      setSavedCatalogId(finalCatalogId);

      const catalogObj = {
        id: finalCatalogId,
        business,
        settings,
        products,
      };

      // If logged in, save under their active profile
      if (currentSeller) {
        await saveSellerCatalog(currentSeller, catalogObj);
      }
      
      // Save/Publish to public catalogs collection
      await savePublicCatalog(finalCatalogId, catalogObj);

      setIsShareModalOpen(true);
    } catch (error: any) {
      console.error('Error al guardar:', error);
      alert(error.message || 'Error de conexión al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuthSuccess = (username: string, catalog: Catalog) => {
    setCurrentSeller(username);
    localStorage.setItem('seller_username', username);
    setBusiness(catalog.business);
    setSettings(catalog.settings);
    setProducts(catalog.products || []);
    setSavedCatalogId(catalog.id);
  };

  const handleLogout = () => {
    if (confirm('¿Estás seguro de que deseas cerrar tu sesión de vendedor? Las modificaciones no sincronizadas se mantendrán de forma local.')) {
      setCurrentSeller(null);
      localStorage.removeItem('seller_username');
      localStorage.removeItem('local_catalog_data');
      setBusiness(DEFAULT_BUSINESS);
      setSettings(DEFAULT_SETTINGS);
      setProducts(PRESET_PRODUCTS);
      setSavedCatalogId(null);
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
    }
  };

  const handleShareToWhatsApp = () => {
    if (shareUrl) {
      const text = `¡Hola! Te comparto mi catálogo digital interactivo de ${business.name}. Puedes ver mis productos y hacer tu pedido directamente desde aquí: ${shareUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // Standalone Customer Mode Presentation
  if (isCustomerView) {
    if (isLoadingCatalog) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-400 font-semibold tracking-wide uppercase">Cargando catálogo interactivo...</p>
          </div>
        </div>
      );
    }

    if (catalogError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 text-center text-white">
          <div className="max-w-md bg-neutral-900 p-8 rounded-2xl shadow-2xl border border-neutral-800 space-y-4">
            <div className="w-12 h-12 bg-red-950 text-red-400 flex items-center justify-center rounded-full mx-auto font-bold text-xl border border-red-900">
              !
            </div>
            <h2 className="text-lg font-bold">Catálogo No Disponible</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">{catalogError}</p>
            <a
              href={window.location.origin + window.location.pathname}
              className="inline-block bg-white text-black text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-neutral-200 transition shadow"
            >
              Crear Mi Propio Catálogo
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

  // Seller Workspace Panel
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-200" id="creator-dashboard-root">
      
      {/* Responsive Header for Laptop & Smartphone */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40 px-4 py-3 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Brand branding */}
          <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-2 rounded-xl shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xs font-black text-neutral-900 dark:text-neutral-50 tracking-tight leading-none">Catálogo Inteligente</h1>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold mt-0.5">Vendedor Digital</p>
              </div>
            </div>

            {/* Quick Action Buttons on Mobile Viewports */}
            <div className="flex items-center gap-1.5 sm:hidden">
              {currentSeller ? (
                <button
                  onClick={handleLogout}
                  title="Cerrar sesión de vendedor"
                  className="bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 p-2.5 rounded-xl transition border border-transparent"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  title="Acceso Vendedores"
                  className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-2.5 rounded-xl font-bold text-[10px] transition"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={handleSaveAndPublish}
                disabled={isSaving}
                className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 p-2.5 rounded-xl font-bold transition flex items-center justify-center shadow"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Navigation & Desktop Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            
            {/* View Mode Tabs */}
            <div className="flex bg-neutral-100 dark:bg-neutral-950 p-1 rounded-xl w-full sm:w-auto justify-center border border-transparent dark:border-neutral-800">
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'editor' 
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'preview' 
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs' 
                    : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Vista Previa</span>
              </button>
            </div>

            {/* Desktop Action bar */}
            <div className="hidden sm:flex items-center gap-2">
              {currentSeller ? (
                <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 rounded-xl">
                  <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                    Sincronizado: <span className="text-neutral-950 dark:text-white underline">{currentSeller}</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    title="Cerrar sesión de vendedor"
                    className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-850 rounded-lg text-red-500 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 text-xs font-bold px-3.5 py-2 rounded-lg transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Acceso Vendedores</span>
                </button>
              )}

              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 text-xs font-bold px-3.5 py-2 rounded-lg transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Exportar catálogo en PDF listo para imprimir o compartir"
              >
                <FileDown className="w-3.5 h-3.5 text-blue-600" />
                <span>Exportar PDF</span>
              </button>

              <button
                onClick={handleSaveAndPublish}
                disabled={isSaving}
                className="bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white text-xs font-bold px-4 py-2 rounded-lg transition inline-flex items-center gap-1.5 shadow cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Guardar y Compartir</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* EDITOR COLUMN */}
          <div className={`lg:col-span-7 space-y-6 ${activeTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
            
            {/* 1. Datos Negocio y Marca */}
            <BusinessSettings
              business={business}
              setBusiness={setBusiness}
              settings={settings}
              setSettings={setSettings}
            />

            {/* 2. Drag & Drop File Loader */}
            <ProductUploader
              onProductsUploaded={handleProductsUploaded}
              currency={settings.currency}
            />

            {/* 3. List of Products */}
            <ProductList
              products={products}
              setProducts={setProducts}
              currency={settings.currency}
            />
          </div>

          {/* DYNAMIC LIVE STOREFRONT PREVIEW */}
          <div className={`lg:col-span-5 ${activeTab === 'preview' ? 'block' : 'hidden lg:block lg:sticky lg:top-20'}`}>
            <CatalogPreview
              business={business}
              settings={settings}
              products={products}
              isCustomerView={false}
            />
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 py-4 mt-12 text-center text-[11px] text-neutral-400 dark:text-neutral-500 font-medium transition-colors">
        Generador de Catálogos de Productos &copy; {new Date().getFullYear()} • Desarrollado con Inteligencia Artificial.
      </footer>

      {/* SELLER REGISTRATION & LOGIN MODAL */}
      <SellerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* SHARE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 dark:border-neutral-850 relative space-y-4 text-neutral-900 dark:text-neutral-100 transition-colors">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">¡Catálogo Publicado Exitosamente!</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                Tu catálogo interactivo está guardado de forma segura en la nube y listo para ser compartido con tus clientes.
              </p>
            </div>

            {/* Link Box */}
            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-850 rounded-xl p-3.5 space-y-2.5">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Enlace de Acceso Clientes</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 px-3 py-2 rounded-lg flex-1 outline-none font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold px-3 py-2 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleShareToWhatsApp}
                className="bg-green-600 hover:bg-green-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition inline-flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-white" />
                WhatsApp
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-250 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs py-2.5 px-4 rounded-xl transition inline-flex items-center justify-center gap-1.5"
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
                className="w-full bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-750 transition inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-blue-600" />
                Descargar Catálogo en PDF (Impresión / Offline)
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
