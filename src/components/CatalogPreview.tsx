import React, { useState, useMemo } from 'react';
import { Product, BusinessInfo, CatalogSettings } from '../types';
import PdfExportModal from './PdfExportModal';
import ImageLightboxModal from './ImageLightboxModal';
import {
  Search,
  ShoppingCart,
  Send,
  MapPin,
  Clock,
  Check,
  Instagram,
  X,
  Plus,
  Minus,
  MessageSquare,
  Sparkles,
  Smartphone,
  Monitor,
  Share2,
  FileDown,
  Printer,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';

interface CatalogPreviewProps {
  business: BusinessInfo;
  settings: CatalogSettings;
  products: Product[];
  isCustomerView?: boolean;
}

export default function CatalogPreview({
  business,
  settings,
  products,
  isCustomerView = false,
}: CatalogPreviewProps) {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('desktop');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [lightboxProductId, setLightboxProductId] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const isDarkMode = Boolean(
    settings.darkMode ||
    settings.theme === 'dark' ||
    settings.theme === 'premium'
  );

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, originalUrl: string) => {
    const target = e.currentTarget;
    if (originalUrl && !target.src.includes('/api/proxy-image') && originalUrl.startsWith('http')) {
      target.src = `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
    } else {
      target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80';
    }
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const list = new Set<string>();
    list.add('Todos');
    products.forEach((p) => {
      if (p.category && p.category.trim() !== '') {
        list.add(p.category.trim());
      }
    });
    return Array.from(list);
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.attributes?.sku && p.attributes.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.attributes?.brand && p.attributes.brand.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Cart operations
  const addToCart = (productId: string) => {
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      if (copy[productId] <= 1) {
        delete copy[productId];
      } else {
        copy[productId]--;
      }
      return copy;
    });
  };

  const clearCart = () => setCart({});

  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((total, [productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      return total + (product ? product.price * qty : 0);
    }, 0);
  }, [cart, products]);

  // Generate WhatsApp Order Link
  const handleSendOrder = () => {
    if (cartCount === 0) return;

    let orderText = `*📋 PEDIDO NUEVO - ${business.name || 'Catálogo'}*\n`;
    orderText += `=================================\n\n`;
    orderText += `Hola, me gustaría encargar los siguientes productos:\n\n`;

    Object.entries(cart).forEach(([productId, qty]) => {
      const p = products.find((prod) => prod.id === productId);
      if (p) {
        orderText += `*• ${qty}x* _${p.name}_ - $${(p.price * qty).toFixed(2)} ${settings.currency} `;
        if (p.attributes?.sku) orderText += `(Ref: ${p.attributes.sku})`;
        orderText += `\n`;
      }
    });

    orderText += `\n=================================\n`;
    orderText += `*Total del Pedido:* $${cartTotal.toFixed(2)} ${settings.currency}\n\n`;

    if (selectedPaymentMethod) {
      orderText += `*Método de Pago:* ${selectedPaymentMethod}\n`;
    }

    orderText += `\n_Pedido generado automáticamente desde tu Catálogo Online._`;

    const encodedText = encodeURIComponent(orderText);
    const whatsappUrl = `https://wa.me/${business.whatsapp}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  // Dynamic Styles
  const primaryBg = { backgroundColor: settings.primaryColor };
  const primaryText = { color: settings.primaryColor };
  const primaryBorder = { borderColor: settings.primaryColor };

  // Theme-specific wrapper classes (Dark negro y blanco as default dark)
  const getThemeClasses = () => {
    if (settings.theme === 'dark' || (isDarkMode && settings.theme !== 'retro')) {
      return 'bg-black text-white min-h-screen';
    }
    switch (settings.theme) {
      case 'premium':
        return 'bg-neutral-950 text-neutral-100 min-h-screen';
      case 'retro':
        return 'bg-[#FAF7F0] text-neutral-800 min-h-screen font-serif';
      case 'minimalist':
        return 'bg-white text-neutral-900 min-h-screen';
      default:
        return 'bg-neutral-50/50 text-neutral-800 min-h-screen';
    }
  };

  const getCardClasses = () => {
    if (settings.theme === 'dark' || (isDarkMode && settings.theme !== 'retro')) {
      return 'bg-[#0e0e10] border border-neutral-800 rounded-2xl overflow-hidden shadow-md hover:border-neutral-700 transition flex flex-col justify-between';
    }
    switch (settings.theme) {
      case 'premium':
        return 'bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between';
      case 'retro':
        return 'bg-white border-2 border-neutral-800 rounded-none overflow-hidden flex flex-col justify-between';
      case 'minimalist':
        return 'bg-white rounded-none overflow-hidden hover:opacity-95 flex flex-col justify-between';
      default:
        return 'bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between';
    }
  };

  const isThemeDark = settings.theme === 'dark' || settings.theme === 'premium' || isDarkMode;

  const content = (
    <div className={`${getThemeClasses()} pb-32`} id="catalog-storefront-wrapper">
      {/* Header Comercial Adaptado a Smartphones */}
      <div className={`p-4 sm:p-6 border-b transition-colors ${
        isThemeDark ? 'border-neutral-800 bg-[#0a0a0a]' : 'border-neutral-100 bg-white'
      }`}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt="Logo negocio"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-black shrink-0"
              />
            ) : (
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl text-white font-bold text-base sm:text-lg flex items-center justify-center shadow-sm shrink-0"
                style={primaryBg}
              >
                {business.name?.substring(0, 2).toUpperCase() || 'CAT'}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">{business.name || 'Catálogo Online'}</h1>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs opacity-75">
                {business.address && (
                  <span className="flex items-center gap-1 truncate max-w-[200px] sm:max-w-none">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{business.address}</span>
                  </span>
                )}
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="flex items-center gap-1 hover:underline">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    {business.phone}
                  </a>
                )}
                {business.instagram && (
                  <a
                    href={`https://instagram.com/${business.instagram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:underline"
                  >
                    <Instagram className="w-3.5 h-3.5 shrink-0" />
                    @{business.instagram}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print self-stretch sm:self-auto justify-end">
            <button
              onClick={() => setIsPdfModalOpen(true)}
              title="Descargar o imprimir catálogo en PDF"
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 text-xs font-semibold rounded-xl transition border min-h-[40px] sm:min-h-0 ${
                isThemeDark
                  ? 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white'
                  : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <FileDown className="w-4 h-4 text-blue-500" />
              <span>PDF</span>
            </button>

            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-xs font-semibold text-white rounded-xl transition hover:brightness-110 shadow-xs min-h-[40px] sm:min-h-0"
                style={primaryBg}
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Cuerpo del Catálogo */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6 space-y-4 sm:space-y-6">
        {/* Barra de Búsqueda y Categorías con Touch Scroll */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar productos o referencias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-8 py-2.5 text-xs rounded-xl focus:outline-none transition ${
                isThemeDark
                  ? 'bg-neutral-900 border border-neutral-800 text-white focus:border-neutral-700 placeholder-neutral-500'
                  : 'bg-white border border-neutral-200 text-neutral-800 focus:ring-1 focus:ring-neutral-400'
              }`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1.5 sm:pb-0 scrollbar-none snap-x touch-pan-x">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap snap-start shrink-0 min-h-[32px] flex items-center ${
                    selectedCategory === cat
                      ? 'text-white'
                      : isThemeDark
                      ? 'bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                      : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                  }`}
                  style={selectedCategory === cat ? primaryBg : undefined}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Productos Encontrados */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 space-y-2 opacity-75">
            <p className="text-sm font-medium">No se encontraron productos coincidentes.</p>
            <p className="text-xs">Prueba escribiendo otra palabra clave o selecciona otra categoría.</p>
          </div>
        ) : (
          <div
            className={
              settings.layout === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4'
                : 'space-y-3 sm:space-y-4'
            }
          >
            {filteredProducts.map((p) => {
              const qtyInCart = cart[p.id] || 0;
              const isAgotado = p.attributes?.availability === 'Agotado';

              return (
                <div key={p.id} className={getCardClasses()} data-product-card>
                  {/* Foto del Producto */}
                  <div className="aspect-square relative bg-neutral-100 dark:bg-neutral-900 overflow-hidden group">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => handleImageError(e, p.imageUrl)}
                      onClick={() => setLightboxProductId(p.id)}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-zoom-in"
                    />
                    
                    {/* Badge de Disponibilidad */}
                    {p.attributes?.availability && p.attributes.availability !== 'Disponible' && (
                      <span className={`absolute top-2 left-2 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${
                        isAgotado ? 'bg-red-500 text-white' : 'bg-amber-500 text-neutral-900'
                      }`}>
                        {p.attributes.availability}
                      </span>
                    )}

                    {/* Botón de Añadir rápido (Overlay) */}
                    {!isAgotado && (
                      <button
                        onClick={() => addToCart(p.id)}
                        className="absolute bottom-2 right-2 p-2.5 rounded-full text-white shadow-md hover:scale-105 active:scale-95 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                        style={primaryBg}
                        title="Añadir al carrito"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Detalles del Producto */}
                  <div className="p-3 sm:p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      {p.category && (
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60">
                          {p.category}
                        </span>
                      )}
                      <h3 className="text-xs sm:text-sm font-bold line-clamp-2 mt-0.5">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-[10px] sm:text-[11px] opacity-70 line-clamp-2 mt-0.5">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 mt-2 pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                      {/* Atributos opcionales */}
                      {settings.showAttributes && p.attributes && (
                        <div className="text-[9px] sm:text-[10px] space-y-0.5 opacity-80 font-sans">
                          {p.attributes.brand && (
                            <p className="truncate">
                              <span className="font-semibold">Marca:</span> {p.attributes.brand}
                            </p>
                          )}
                          {p.attributes.colors && p.attributes.colors.length > 0 && (
                            <p className="truncate">
                              <span className="font-semibold">Colores:</span>{' '}
                              {p.attributes.colors.join(', ')}
                            </p>
                          )}
                          {p.attributes.sizes && p.attributes.sizes.length > 0 && (
                            <p className="truncate">
                              <span className="font-semibold">Tallas:</span>{' '}
                              {p.attributes.sizes.join(', ')}
                            </p>
                          )}
                        </div>
                      )}

                      {settings.showSku && p.attributes?.sku && (
                        <p className="text-[9px] font-mono opacity-50 truncate">SKU: {p.attributes.sku}</p>
                      )}

                      {/* Precio y cantidad touch-friendly */}
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                          ${p.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settings.currency}
                        </span>

                        {qtyInCart > 0 && (
                          <div className={`flex items-center gap-1 py-1 px-1.5 rounded-lg text-xs font-bold ${
                            isThemeDark ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-900'
                          }`}>
                            <button
                              onClick={() => removeFromCart(p.id)}
                              className="p-1 hover:text-red-500 rounded active:scale-90 transition min-w-[24px] min-h-[24px] flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="min-w-[16px] text-center text-[11px] font-mono">{qtyInCart}</span>
                            <button
                              onClick={() => addToCart(p.id)}
                              className="p-1 hover:text-green-500 rounded active:scale-90 transition min-w-[24px] min-h-[24px] flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Información Adicional en el Footer del catálogo */}
        {(business.paymentMethods.length > 0 || business.additionalInfo) && (
          <div className={`p-4 sm:p-6 rounded-2xl border mt-8 sm:mt-10 transition-colors ${
            isThemeDark
              ? 'bg-[#0e0e10] border-neutral-800 text-white'
              : 'bg-white border-neutral-200/80 shadow-xs text-neutral-900'
          }`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Información y Condiciones</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 text-xs">
              {business.paymentMethods.length > 0 && (
                <div>
                  <h5 className="font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">Métodos de Pago Aceptados:</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {business.paymentMethods.map((m) => (
                      <span
                        key={m}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          isThemeDark
                            ? 'bg-neutral-900 text-neutral-200 border border-neutral-800'
                            : 'bg-neutral-50 text-neutral-700 border border-neutral-200'
                        }`}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {business.additionalInfo && (
                <div>
                  <h5 className="font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Envíos y Entregas:</h5>
                  <p className="opacity-80 leading-relaxed text-xs">{business.additionalInfo}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Barra de Pedido Flotante para Smartphones y Desktop */}
      {cartCount > 0 && (
        <div className="fixed bottom-3 sm:bottom-6 inset-x-3 sm:inset-x-4 max-w-lg mx-auto bg-neutral-950/95 dark:bg-black/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-neutral-800 p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-4 z-50 animate-bounce-short mb-safe">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative bg-neutral-800 p-2 sm:p-2.5 rounded-xl border border-neutral-700/50 shrink-0">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-[10px] font-bold text-white w-5 h-5 rounded-full flex items-center justify-center shadow">
                {cartCount}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-neutral-400">Total acumulado</p>
              <p className="text-xs sm:text-sm font-bold font-mono truncate">
                ${cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settings.currency}
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold px-3 py-2 sm:py-2.5 rounded-xl transition active:scale-95"
            >
              Carrito
            </button>
            <button
              onClick={handleSendOrder}
              className="bg-green-600 hover:bg-green-500 text-xs font-bold px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition flex items-center gap-1.5 shadow active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Pedir</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet del Carrito */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] pb-safe sm:pb-0 ${
            isThemeDark ? 'bg-[#0e0e10] border border-neutral-800 text-white' : 'bg-white text-neutral-800'
          }`}>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                Tu Pedido ({cartCount} artículos)
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3 max-h-[50vh]">
              {Object.entries(cart).map(([productId, qty]) => {
                const p = products.find((prod) => prod.id === productId);
                if (!p) return null;

                return (
                  <div key={p.id} className="flex items-center gap-3 justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img 
                        src={p.imageUrl} 
                        alt={p.name} 
                        referrerPolicy="no-referrer" 
                        onError={(e) => handleImageError(e, p.imageUrl)}
                        className="w-11 h-11 rounded-xl object-cover border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-black shrink-0" 
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{p.name}</p>
                        <p className="text-[10px] opacity-60 font-mono mt-0.5">
                          ${p.price.toFixed(2)} x {qty} = ${(p.price * qty).toFixed(2)} {settings.currency}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => removeFromCart(p.id)}
                        className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-red-500 active:scale-90 transition min-w-[28px] min-h-[28px] flex items-center justify-center"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold font-mono min-w-[16px] text-center">{qty}</span>
                      <button
                        onClick={() => addToCart(p.id)}
                        className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-green-500 active:scale-90 transition min-w-[28px] min-h-[28px] flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Selector de Método de Pago */}
              {business.paymentMethods.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase opacity-60">Selecciona Método de Pago:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {business.paymentMethods.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(m)}
                        className={`px-2.5 py-2 rounded-xl text-[11px] font-medium border text-left transition ${
                          selectedPaymentMethod === m
                            ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-black font-bold'
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black/60 space-y-3 rounded-b-2xl">
              <div className="flex justify-between font-bold text-sm">
                <span>Total a Pagar:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  ${cartTotal.toFixed(2)} {settings.currency}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={clearCart}
                  className="px-4 py-2.5 border border-neutral-300 dark:border-neutral-700 text-xs font-bold rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-center text-neutral-500 dark:text-neutral-400 active:scale-95"
                >
                  Vaciar
                </button>
                <button
                  onClick={handleSendOrder}
                  className="px-4 py-2.5 text-white text-xs font-bold rounded-xl hover:brightness-110 transition flex items-center justify-center gap-1.5 shadow active:scale-95"
                  style={primaryBg}
                >
                  <Send className="w-4 h-4" />
                  <span>Pedir por WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visor Lightbox con Pan y Pinch-to-Zoom */}
      <ImageLightboxModal
        isOpen={!!lightboxProductId}
        onClose={() => setLightboxProductId(null)}
        products={filteredProducts.length > 0 ? filteredProducts : products}
        initialProductId={lightboxProductId}
        currency={settings.currency}
        primaryColor={settings.primaryColor}
      />
    </div>
  );

  // If this is the standalone customer view link, render directly
  if (isCustomerView) {
    return content;
  }

  // Creator Frame / Dashboard Simulator
  return (
    <div className="space-y-4" id="catalog-preview-container">
      <div className="bg-white dark:bg-[#0e0e10] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-xs transition-colors">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            Vista Previa de Tienda
          </h3>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
            Simula la experiencia de compra en smartphone o computadora.
          </p>
        </div>

        {/* Action Buttons and Device Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
            title="Exportar Catálogo en PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-500" />
            <span>PDF</span>
          </button>

          <div className="hidden lg:flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1 bg-neutral-50 dark:bg-neutral-900">
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded-lg transition ${
                deviceMode === 'mobile'
                  ? 'bg-white dark:bg-neutral-800 shadow-xs text-neutral-900 dark:text-white'
                  : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
              }`}
              title="Vista Móvil"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded-lg transition ${
                deviceMode === 'desktop'
                  ? 'bg-white dark:bg-neutral-800 shadow-xs text-neutral-900 dark:text-white'
                  : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
              }`}
              title="Vista Escritorio"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Preview Rendering */}
      <div className="lg:hidden">
        {/* On small mobile screens, render full-bleed directly for optimum mobile UX */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-md">
          {content}
        </div>
      </div>

      <div className="hidden lg:block">
        {deviceMode === 'mobile' ? (
          <div className="flex justify-center py-4 bg-neutral-100 dark:bg-black/80 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-inner">
            <div className="w-[375px] h-[750px] bg-white dark:bg-black rounded-[40px] border-[12px] border-neutral-900 dark:border-neutral-800 overflow-hidden shadow-2xl relative flex flex-col">
              {/* Phone Speaker Notch */}
              <div className="absolute top-0 inset-x-0 h-6 bg-neutral-900 dark:bg-neutral-800 flex justify-center items-center z-50">
                <div className="w-16 h-3 bg-neutral-800 dark:bg-neutral-700 rounded-full" />
              </div>
              <div className="flex-1 overflow-y-auto pt-6 scrollbar-none">
                {content}
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-md max-h-[750px] overflow-y-auto">
            {content}
          </div>
        )}
      </div>

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
