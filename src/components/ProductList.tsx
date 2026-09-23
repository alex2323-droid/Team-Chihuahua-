import React, { useState } from 'react';
import { Product, ProductAttributes } from '../types';
import {
  Tag,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Sliders,
  AlertTriangle,
  Layers,
  ArrowUp,
  ArrowDown,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';

interface ProductListProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  currency: string;
}

export default function ProductList({ products, setProducts, currency }: ProductListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, originalUrl: string) => {
    const target = e.currentTarget;
    if (originalUrl && !target.src.includes('/api/proxy-image') && originalUrl.startsWith('http')) {
      target.src = `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
    } else {
      target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80';
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleUpdateProduct = (id: string, fields: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, ...fields };
        }
        return p;
      })
    );
  };

  const handleUpdateAttributes = (id: string, fields: Partial<ProductAttributes>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            attributes: {
              ...(p.attributes || {}),
              ...fields,
            },
          };
        }
        return p;
      })
    );
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDuplicateProduct = (p: Product) => {
    const duplicated: Product = {
      ...p,
      id: `copy-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${p.name} (Copia)`,
      attributes: p.attributes
        ? {
            ...p.attributes,
            sku: `${p.attributes.sku || 'PROD'}-COP`,
          }
        : undefined,
    };
    setProducts((prev) => [...prev, duplicated]);
  };

  const handleMoveProduct = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === products.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setProducts((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleAddManualProduct = () => {
    const manualId = `manual-${Date.now()}`;
    const newProduct: Product = {
      id: manualId,
      name: 'Nuevo Producto Manual',
      price: 0,
      imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=60',
      description: 'Añade una descripción atractiva para tus clientes.',
      category: 'General',
      imageAnalysisStatus: 'completed',
      attributes: {
        sku: `PROD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        availability: 'Disponible',
        colors: [],
        sizes: [],
        features: [],
      },
    };
    setProducts((prev) => [...prev, newProduct]);
    setExpandedId(manualId);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/50">Pendiente</span>;
      case 'analyzing':
        return <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/50 animate-pulse">Escaneando...</span>;
      case 'failed':
        return <span className="bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/50">Falló Análisis</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 text-neutral-800 dark:text-neutral-100" id="product-list-panel">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
            <Layers className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            Lista de Productos ({products.length})
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Organiza, edita detalles y reordena los productos de tu catálogo.
          </p>
        </div>
        <button
          onClick={handleAddManualProduct}
          className="inline-flex items-center gap-1 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Añadir Manual
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl p-8 text-center space-y-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">No hay productos en el catálogo todavía.</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-sm mx-auto">
            Utiliza la sección de arriba para arrastrar tus fotos con precios, o añade un producto de forma manual para comenzar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product, index) => {
            const isExpanded = expandedId === product.id;
            const isAnalyzing = product.imageAnalysisStatus === 'analyzing';

            return (
              <div
                key={product.id}
                className={`bg-white dark:bg-neutral-900 rounded-xl border transition shadow-sm overflow-hidden ${
                  isExpanded 
                    ? 'border-neutral-900 dark:border-white ring-1 ring-neutral-900 dark:ring-white' 
                    : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700'
                }`}
              >
                {/* Cabecera del Producto */}
                <div className="p-4 flex items-center justify-between gap-3 cursor-pointer" onClick={() => toggleExpand(product.id)}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => handleImageError(e, product.imageUrl)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedImage(product.imageUrl);
                      }}
                      className="w-12 h-12 rounded-lg object-cover bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 flex-shrink-0 cursor-zoom-in hover:opacity-90 transition"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{product.name}</h3>
                        {getStatusBadge(product.imageAnalysisStatus)}
                        {product.imageQuality === 'Poor' && (
                          <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-100 dark:border-amber-900/50">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            Calidad Baja
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {currency} {product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Botones de Reordenar */}
                    <button
                      disabled={index === 0}
                      onClick={() => handleMoveProduct(index, 'up')}
                      className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={index === products.length - 1}
                      onClick={() => handleMoveProduct(index, 'down')}
                      className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />

                    {/* Copiar */}
                    <button
                      onClick={() => handleDuplicateProduct(product)}
                      className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Eliminar */}
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => toggleExpand(product.id)}
                      className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Editor Detallado (Expandible) */}
                {isExpanded && (
                  <div className="border-t border-neutral-100 dark:border-neutral-800 p-5 bg-neutral-50/50 dark:bg-neutral-950/40 space-y-4">
                    {/* Advertencia de Imagen Calidad Baja */}
                    {product.imageQuality === 'Poor' && (
                      <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-lg p-3 text-xs border border-amber-100 dark:border-amber-900/50 flex gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Fotografía de baja calidad</p>
                          <p className="text-neutral-600 dark:text-neutral-400 mt-0.5">
                            Gemini detectó que esta imagen es un poco borrosa o tiene mala iluminación. Te recomendamos subir una foto más clara para mejorar la experiencia de tus clientes.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Nombre y Precio */}
                      <div className="md:col-span-2 space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-350 mb-1">Nombre Comercial del Producto</label>
                          <input
                            type="text"
                            value={product.name || ''}
                            onChange={(e) => handleUpdateProduct(product.id, { name: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white focus:outline-none text-neutral-800 dark:text-neutral-100 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-350 mb-1">Precio de Venta ({currency})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={product.price || ''}
                            onChange={(e) => handleUpdateProduct(product.id, { price: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white focus:outline-none text-neutral-800 dark:text-neutral-100 transition"
                          />
                        </div>
                      </div>

                      {/* Miniatura grande con opción de re-subir */}
                      <div className="md:col-span-1 flex flex-col items-center justify-center p-3 border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg">
                        <img
                          src={product.imageUrl}
                          alt="preview"
                          referrerPolicy="no-referrer"
                          onError={(e) => handleImageError(e, product.imageUrl)}
                          onClick={() => setZoomedImage(product.imageUrl)}
                          className="w-20 h-20 rounded object-cover bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 cursor-zoom-in hover:opacity-90 transition"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          id={`replace-img-${product.id}`}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onloadend = () => {
                                handleUpdateProduct(product.id, { imageUrl: r.result as string, imageQuality: undefined });
                              };
                              r.readAsDataURL(file);
                            }
                          }}
                        />
                        <label
                          htmlFor={`replace-img-${product.id}`}
                          className="text-[10px] text-neutral-600 dark:text-neutral-350 hover:text-neutral-900 dark:hover:text-white font-semibold mt-2 cursor-pointer border border-neutral-200 dark:border-neutral-800 px-2.5 py-1 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                        >
                          Cambiar Foto
                        </label>
                      </div>
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-350 mb-1">Descripción Comercial</label>
                      <textarea
                        rows={2}
                        value={product.description || ''}
                        onChange={(e) => handleUpdateProduct(product.id, { description: e.target.value })}
                        placeholder="Describe las virtudes de este artículo..."
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white focus:outline-none text-neutral-800 dark:text-neutral-100 transition resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Categoría */}
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-350 mb-1">Categoría</label>
                        <input
                          type="text"
                          value={product.category || ''}
                          onChange={(e) => handleUpdateProduct(product.id, { category: e.target.value })}
                          placeholder="Ej. Ropa, Calzado, Hogar"
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white focus:outline-none text-neutral-800 dark:text-neutral-100 transition"
                        />
                      </div>

                      {/* SKU */}
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-350 mb-1">Código / SKU</label>
                        <input
                          type="text"
                          value={product.attributes?.sku || ''}
                          onChange={(e) => handleUpdateAttributes(product.id, { sku: e.target.value })}
                          placeholder="Ej. BOOT-A01"
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white focus:outline-none font-mono uppercase text-neutral-800 dark:text-neutral-100 transition"
                        />
                      </div>

                      {/* Disponibilidad */}
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-350 mb-1">Disponibilidad</label>
                        <select
                          value={product.attributes?.availability || 'Disponible'}
                          onChange={(e) => handleUpdateAttributes(product.id, { availability: e.target.value as any })}
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white focus:outline-none text-neutral-800 dark:text-neutral-100 transition"
                        >
                          <option value="Disponible">Disponible</option>
                          <option value="Bajo pedido">Bajo pedido</option>
                          <option value="Agotado">Agotado</option>
                        </select>
                      </div>
                    </div>

                    {/* Especificaciones Extensibles (Tallas, Colores, Marca, Modelo) */}
                    <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-3">
                      <p className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Atributos del Producto</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Colores Disponibles (separados por coma)</label>
                          <input
                            type="text"
                            value={product.attributes?.colors?.join(', ') || ''}
                            onChange={(e) =>
                              handleUpdateAttributes(product.id, {
                                colors: e.target.value.split(',').map((c) => c.trim()).filter(Boolean),
                              })
                            }
                            placeholder="Negro, Azul, Blanco"
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white focus:outline-none text-neutral-800 dark:text-neutral-100 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Tallas o Tamaños (separados por coma)</label>
                          <input
                            type="text"
                            value={product.attributes?.sizes?.join(', ') || ''}
                            onChange={(e) =>
                              handleUpdateAttributes(product.id, {
                                sizes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                              })
                            }
                            placeholder="S, M, L o 38, 39, 40"
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white focus:outline-none text-neutral-800 dark:text-neutral-100 transition"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Marca</label>
                          <input
                            type="text"
                            value={product.attributes?.brand || ''}
                            onChange={(e) => handleUpdateAttributes(product.id, { brand: e.target.value })}
                            placeholder="Opcional"
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white focus:outline-none text-neutral-800 dark:text-neutral-100 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Modelo</label>
                          <input
                            type="text"
                            value={product.attributes?.model || ''}
                            onChange={(e) => handleUpdateAttributes(product.id, { model: e.target.value })}
                            placeholder="Opcional"
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white focus:outline-none text-neutral-800 dark:text-neutral-100 transition"
                          />
                        </div>
                      </div>

                      {/* Características / Balas de especificación */}
                      <div>
                        <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">Características Especiales (separadas por coma)</label>
                        <input
                          type="text"
                          value={product.attributes?.features?.join(', ') || ''}
                          onChange={(e) =>
                            handleUpdateAttributes(product.id, {
                              features: e.target.value.split(',').map((f) => f.trim()).filter(Boolean),
                            })
                          }
                          placeholder="Resistente al agua, 100% Algodón, Conexión Bluetooth"
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white focus:outline-none text-neutral-800 dark:text-neutral-100 transition"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          {/* Top Info Bar */}
          <div className="absolute top-4 inset-x-4 flex justify-between items-center text-white z-[100000] pointer-events-none">
            <p className="text-xs font-bold tracking-wide bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-white">
              Vista Ampliada del Producto
            </p>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition shadow-md pointer-events-auto"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <img 
            src={zoomedImage} 
            alt="Product Zoom" 
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform animate-zoom-in"
          />
          
          <p className="text-[11px] text-neutral-400 mt-4 text-center select-none bg-black/45 px-3 py-1 rounded-full text-neutral-300">
            Toca en cualquier parte para cerrar
          </p>
        </div>
      )}
    </div>
  );
}
