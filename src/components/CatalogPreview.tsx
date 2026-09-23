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
  const secondaryBg = { backgroundColor: settings.secondaryColor };

  // Theme-specific wrapper classes
  const getThemeClasses = () => {
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
    switch (settings.theme) {
      case 'premium':
        return 'bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg';
      case 'retro':
        return 'bg-white border-2 border-neutral-800 rounded-none overflow-hidden';
      case 'minimalist':
        return 'bg-white rounded-none overflow-hidden hover:opacity-95';
      default:
        return 'bg-white border border-neutral-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition';
    }
  };

  const content = (
    <div className={`${getThemeClasses()} pb-24`} id="catalog-storefront-wrapper">
      {/* Header Comercial */}
      <div className={`p-6 border-b ${settings.theme === 'premium' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-100 bg-white'}`}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt="Logo negocio"
                className="w-16 h-16 rounded-xl object-cover border border-neutral-100 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl text-white font-bold text-lg flex items-center justify-center shadow-sm" style={primaryBg}>
                {business.name?.substring(0, 2).toUpperCase() || 'CAT'}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight">{business.name || 'Catálogo Online'}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs opacity-75">
                {business.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {business.address}
                  </span>
                )}
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="flex items-center gap-1 hover:underline">
                    <Phone className="w-3.5 h-3.5" />
                    {business.phone}
                  </a>
                )}
                {business.email && (
                  <a href={`mailto:${business.email}`} className="flex items-center gap-1 hover:underline">
                    <Mail className="w-3.5 h-3.5" />
                    {business.email}
                  </a>
                )}
                {business.instagram && (
                  <a
                    href={`https://instagram.com/${business.instagram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:underline"
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    @{business.instagram}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              onClick={() => setIsPdfModalOpen(true)}
              title="Descargar o imprimir catálogo en PDF"
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition border ${
                settings.theme === 'premium'
                  ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                  : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <FileDown className="w-4 h-4 text-blue-500" />
              <span>Exportar PDF</span>
            </button>

            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg transition hover:brightness-110"
                style={primaryBg}
              >
                <MessageSquare className="w-4 h-4" />
                Contactar por WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Cuerpo del Catálogo */}
      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* Barra de Búsqueda y Categorías */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg focus:outline-none transition ${
                settings.theme === 'premium'
                  ? 'bg-neutral-900 border border-neutral-800 text-neutral-100 focus:border-neutral-700'
                  : 'bg-white border border-neutral-200 text-neutral-800 focus:ring-1 focus:ring-neutral-400'
              }`}
            />
          </div>

          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'text-white'
                      : settings.theme === 'premium'
                      ? 'bg-neutral-900 border border-neutral-800 hover:bg-neutral-800'
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
                ? 'grid grid-cols-2 md:grid-cols-3 gap-4'
                : 'space-y-4'
            }
          >
            {filteredProducts.map((p) => {
              const qtyInCart = cart[p.id] || 0;
              const isAgotado = p.attributes?.availability === 'Agotado';

              return (
                <div key={p.id} className={getCardClasses()}>
                  {/* Foto del Producto */}
                  <div className="aspect-square relative bg-neutral-100 overflow-hidden group">
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
                      <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded shadow ${
                        isAgotado ? 'bg-red-500 text-white' : 'bg-amber-500 text-neutral-900'
                      }`}>
                        {p.attributes.availability}
                      </span>
                    )}

                    {/* Botón de Añadir rápido (Overlay) */}
                    {!isAgotado && (
                      <button
                        onClick={() => addToCart(p.id)}
                        className="absolute bottom-2 right-2 p-2 rounded-full text-white shadow-md hover:scale-105 active:scale-95 transition"
                        style={primaryBg}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Detalles del Producto */}
                  <div className="p-4 space-y-1.5 flex flex-col justify-between">
                    <div>
                      {p.category && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                          {p.category}
                        </span>
                      )}
                      <h3 className="text-xs font-bold line-clamp-1 hover:line-clamp-none transition">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-[11px] opacity-70 line-clamp-2 mt-0.5">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 mt-2 pt-2 border-t border-dashed border-black/10">
                      {/* Atributos opcionales */}
                      {settings.showAttributes && p.attributes && (
                        <div className="text-[10px] space-y-1 opacity-80 font-sans">
                          {p.attributes.brand && (
                            <p>
                              <span className="font-semibold">Marca:</span> {p.attributes.brand}
                            </p>
                          )}
                          {p.attributes.model && (
                            <p>
                              <span className="font-semibold">Modelo:</span> {p.attributes.model}
                            </p>
                          )}
                          {p.attributes.colors && p.attributes.colors.length > 0 && (
                            <p>
                              <span className="font-semibold">Colores:</span>{' '}
                              {p.attributes.colors.join(', ')}
                            </p>
                          )}
                          {p.attributes.sizes && p.attributes.sizes.length > 0 && (
                            <p>
                              <span className="font-semibold">Tallas:</span>{' '}
                              {p.attributes.sizes.join(', ')}
                            </p>
                          )}
                          {p.attributes.features && p.attributes.features.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {p.attributes.features.map((f, i) => (
                                <span
                                  key={i}
                                  className={`px-1.5 py-0.5 rounded text-[9px] ${
                                    settings.theme === 'premium'
                                      ? 'bg-neutral-800 text-neutral-300'
                                      : 'bg-neutral-100 text-neutral-600'
                                  }`}
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {settings.showSku && p.attributes?.sku && (
                        <p className="text-[9px] font-mono opacity-50">SKU: {p.attributes.sku}</p>
                      )}

                      {/* Precio y cantidad */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-xs font-bold font-mono" style={primaryText}>
                          $ {p.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settings.currency}
                        </span>

                        {qtyInCart > 0 && (
                          <div className="flex items-center gap-1.5 bg-neutral-100 text-neutral-900 py-1 px-2 rounded-lg text-xs font-bold">
                            <button onClick={() => removeFromCart(p.id)} className="hover:text-red-600">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span>{qtyInCart}</span>
                            <button onClick={() => addToCart(p.id)} className="hover:text-green-600">
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
          <div className={`p-6 rounded-xl border mt-10 ${
            settings.theme === 'premium'
              ? 'bg-neutral-900 border-neutral-800'
              : 'bg-white border-neutral-100 shadow-sm'
          }`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Información Adicional</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {business.paymentMethods.length > 0 && (
                <div>
                  <h5 className="font-semibold text-neutral-500 mb-1.5">Métodos de Pago Aceptados:</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {business.paymentMethods.map((m) => (
                      <span
                        key={m}
                        className={`px-2.5 py-1 rounded-full font-medium ${
                          settings.theme === 'premium' ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-50 text-neutral-700 border border-neutral-200'
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
                  <h5 className="font-semibold text-neutral-500 mb-1">Envíos y Entregas:</h5>
                  <p className="opacity-80 leading-relaxed">{business.additionalInfo}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Barra de Pedido Flotante */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-lg mx-auto bg-neutral-900 text-white rounded-xl shadow-xl border border-neutral-800 p-4 flex items-center justify-between gap-4 z-50 animate-bounce-short">
          <div className="flex items-center gap-3">
            <div className="relative bg-neutral-800 p-2.5 rounded-lg">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-[10px] font-bold text-white w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-400">Total acumulado</p>
              <p className="text-sm font-bold font-mono">
                $ {cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settings.currency}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold px-3 py-2 rounded-lg transition"
            >
              Ver Carrito
            </button>
            <button
              onClick={handleSendOrder}
              className="bg-green-600 hover:bg-green-500 text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar Pedido
            </button>
          </div>
        </div>
      )}

      {/* Modal / Drawer del Carrito */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[85vh] ${
            settings.theme === 'premium' ? 'bg-neutral-900 border border-neutral-800 text-white' : 'bg-white text-neutral-800'
          }`}>
            <div className="p-4 border-b border-black/10 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Tu Pedido ({cartCount})
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="p-1 hover:bg-black/10 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {Object.entries(cart).map(([productId, qty]) => {
                const p = products.find((prod) => prod.id === productId);
                if (!p) return null;

                return (
                  <div key={p.id} className="flex items-center gap-3 justify-between pb-3 border-b border-black/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={p.imageUrl} 
                        alt={p.name} 
                        referrerPolicy="no-referrer" 
                        onError={(e) => handleImageError(e, p.imageUrl)}
                        className="w-10 h-10 rounded object-cover border" 
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{p.name}</p>
                        <p className="text-[10px] opacity-60 font-mono">
                          $ {p.price.toFixed(2)} x {qty}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromCart(p.id)} className="p-1 hover:bg-black/5 rounded text-red-500">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold">{qty}</span>
                      <button onClick={() => addToCart(p.id)} className="p-1 hover:bg-black/5 rounded text-green-600">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Selector de Método de Pago */}
              {business.paymentMethods.length > 0 && (
                <div className="pt-3 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase opacity-60">Selecciona Método de Pago para el pedido:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {business.paymentMethods.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(m)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-medium border text-left transition ${
                          selectedPaymentMethod === m
                            ? 'bg-neutral-900 border-neutral-900 text-white'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-black/10 bg-black/5 space-y-3 rounded-b-xl">
              <div className="flex justify-between font-bold text-sm">
                <span>Subtotal:</span>
                <span className="font-mono">
                  $ {cartTotal.toFixed(2)} {settings.currency}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={clearCart}
                  className="px-4 py-2 border border-neutral-300 text-xs font-bold rounded-lg hover:bg-black/5 transition text-center text-neutral-500"
                >
                  Vaciar
                </button>
                <button
                  onClick={handleSendOrder}
                  className="px-4 py-2 text-white text-xs font-bold rounded-lg hover:brightness-110 transition flex items-center justify-center gap-1.5"
                  style={primaryBg}
                >
                  <Send className="w-4 h-4" />
                  Enviar Pedido
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
      <div className="bg-white border border-neutral-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neutral-500" />
            Vista Previa de Cliente
          </h3>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            Así es exactamente cómo se verá tu catálogo interactivo desde un móvil o computadora.
          </p>
        </div>

        {/* Botones de acción y Toggle de Dispositivo */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
            title="Exportar Catálogo en PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-600" />
            <span>PDF</span>
          </button>

          <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg p-1 bg-neutral-50">
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded transition ${
                deviceMode === 'mobile' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
              }`}
              title="Vista Móvil"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded transition ${
                deviceMode === 'desktop' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
              }`}
              title="Vista Escritorio"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {deviceMode === 'mobile' ? (
        <div className="flex justify-center py-4 bg-neutral-50/50 rounded-2xl border border-neutral-100 shadow-inner">
          <div className="w-[375px] h-[750px] bg-white rounded-[40px] border-[12px] border-neutral-900 overflow-hidden shadow-2xl relative flex flex-col">
            {/* Altavoz y Cámara del móvil */}
            <div className="absolute top-0 inset-x-0 h-6 bg-neutral-900 flex justify-center items-center z-50">
              <div className="w-16 h-3 bg-neutral-800 rounded-full" />
            </div>
            <div className="flex-1 overflow-y-auto pt-6 scrollbar-none">
              {content}
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-md max-h-[750px] overflow-y-auto">
          {content}
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
