import React, { useState, useEffect } from 'react';
import { BusinessInfo, CatalogSettings, Product, Catalog } from './types';
import BusinessSettings from './components/BusinessSettings';
import ProductUploader from './components/ProductUploader';
import ProductList from './components/ProductList';
import CatalogPreview from './components/CatalogPreview';
import PdfExportModal from './components/PdfExportModal';
import { loadInitialStoreProfile, saveStoreProfile } from './utils/storeProfile';
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
  primaryColor: '#111827', // Elegant Blue / Charcoal
  secondaryColor: '#3B82F6',
  theme: 'light',
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
  const [products, setProducts] = useState<Product[]>(PRESET_PRODUCTS);

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

  // Listen for query parameter on load or load persisted store configuration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const catalogId = params.get('id');
    if (catalogId) {
      loadCatalogFromDb(catalogId);
    } else {
      // 1. Load saved store profile (name, contacts, logo, colors, settings)
      loadInitialStoreProfile().then((profile) => {
        if (profile.business) {
          setBusiness((prev) => ({ ...prev, ...profile.business }));
        }
        if (profile.settings) {
          setSettings((prev) => ({ ...prev, ...profile.settings }));
        }
      });

      // 2. Load cached products if available
      try {
        const savedProds = localStorage.getItem('saved_catalog_products');
        if (savedProds) {
          const parsed = JSON.parse(savedProds);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProducts(parsed);
          }
        }
      } catch (err) {
        console.warn('Error loading cached products from storage:', err);
      }
    }
  }, []);

  // Cache products in localStorage whenever updated (only in creator mode)
  useEffect(() => {
    if (!isCustomerView && products && products.length > 0) {
      try {
        localStorage.setItem('saved_catalog_products', JSON.stringify(products));
      } catch (err) {
        console.warn('Could not cache products to localStorage:', err);
      }
    }
  }, [products, isCustomerView]);

  const loadCatalogFromDb = async (id: string) => {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      const response = await fetch(`/api/catalogs/${id}`);
      if (!response.ok) {
        throw new Error('No se pudo encontrar el catálogo solicitado.');
      }
      const data: Catalog = await response.json();
      setBusiness(data.business);
      setSettings(data.settings);
      setProducts(data.products);
      setIsCustomerView(true); // render direct storefront for catalog viewers
    } catch (error: any) {
      console.error('Error loading catalog:', error);
      setCatalogError(error.message || 'Catálogo no encontrado.');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handleProductsUploaded = (newProducts: Product[]) => {
    setProducts((prev) => {
      // Filter out temporary placeholders that were successfully parsed
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
    if (!business.name || !business.whatsapp) {
      alert('Por favor, completa el nombre del negocio y el número de WhatsApp para poder continuar.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/catalogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      // Persist store profile globally as well
      saveStoreProfile(business, settings).catch(() => {});
      setIsShareModalOpen(true);
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
    }
  };

  const handleShareToWhatsApp = () => {
    if (shareUrl) {
      const text = `¡Hola! Te comparto mi catálogo digital interactivo de ${business.name}. Puedes ver mis productos y hacer tu pedido directamente desde aquí: ${shareUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // RENDER CUSTOMER STANDALONE VIEW
  if (isCustomerView) {
    if (isLoadingCatalog) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-500 font-semibold">Cargando catálogo...</p>
          </div>
        </div>
      );
    }

    if (catalogError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 text-center">
          <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-neutral-100 space-y-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 flex items-center justify-center rounded-full mx-auto font-bold text-xl">
              !
            </div>
            <h2 className="text-lg font-bold text-neutral-800">Catálogo No Disponible</h2>
            <p className="text-xs text-neutral-500 leading-relaxed">{catalogError}</p>
            <a
              href={window.location.origin + window.location.pathname}
              className="inline-block bg-neutral-900 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-neutral-800 transition"
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

  // RENDER CREATOR DASHBOARD
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans" id="creator-dashboard-root">
      {/* Top Navbar */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-neutral-900 p-2 rounded-xl text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-neutral-900 tracking-tight">Catálogo Inteligente</h1>
              <p className="text-[10px] text-neutral-500 font-medium">Generador Profesional de Catálogos</p>
            </div>
          </div>

          {/* Navigation Tabs (Mobile optimized layout toggle) */}
          <div className="flex bg-neutral-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'editor' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Configuración y Carga
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'preview' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Vista Previa
            </button>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 text-xs font-semibold px-3.5 py-2 rounded-lg transition inline-flex items-center gap-1.5 shadow-2xs"
              title="Exportar catálogo en PDF listo para imprimir o compartir"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-600" />
              <span>Exportar PDF</span>
            </button>

            <button
              onClick={handleSaveAndPublish}
              disabled={isSaving}
              className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition inline-flex items-center gap-1.5 shadow"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  Guardar y Compartir
                </>
              )}
            </button>
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
      <footer className="bg-white border-t border-neutral-100 py-4 mt-12 text-center text-[11px] text-neutral-400 font-medium">
        Generador de Catálogos de Productos &copy; {new Date().getFullYear()} • Desarrollado con Inteligencia Artificial.
      </footer>

      {/* SHARE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 relative space-y-4">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 p-1 rounded-lg hover:bg-neutral-50 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-800">¡Catálogo Publicado Exitosamente!</h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Tu catálogo interactivo está guardado en el servidor y listo para ser compartido con tus clientes.
              </p>
            </div>

            {/* Link Box */}
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3.5 space-y-2.5">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Link de Acceso Clientes</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="bg-white border border-neutral-200 text-xs text-neutral-600 px-3 py-2 rounded-lg flex-1 outline-none font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition inline-flex items-center gap-1.5"
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
                className="bg-green-600 hover:bg-green-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition inline-flex items-center justify-center gap-1.5 shadow"
              >
                <Share2 className="w-4 h-4" />
                WhatsApp
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs py-2.5 px-4 rounded-xl transition inline-flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Catálogo
              </a>
            </div>

            {/* Offline / Physical Print PDF Option */}
            <div className="pt-2 border-t border-neutral-100">
              <button
                onClick={() => {
                  setSavedCatalogId(null);
                  setIsPdfModalOpen(true);
                }}
                className="w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold py-2.5 px-4 rounded-xl border border-neutral-200 transition inline-flex items-center justify-center gap-2"
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
