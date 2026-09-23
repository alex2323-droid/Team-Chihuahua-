import React, { useState, useRef } from 'react';
import { Upload, DollarSign, Image as ImageIcon, Sparkles, AlertCircle, Link as LinkIcon, Globe, Info } from 'lucide-react';
import { Product } from '../types';

interface ProductUploaderProps {
  onProductsUploaded: (newProducts: Product[]) => void;
  currency: string;
}

// Strict system prompt for AI extraction from images and URLs
export const STRICT_SYSTEM_PROMPT =
  'Analiza el contenido de esta URL/imagen. Extrae únicamente el nombre comercial del producto, descartando cualquier mención a la plataforma de origen (ej. Temu), precios originales, logos o marcas de agua. Devuelve solo un título limpio y la URL de la imagen principal en alta resolución';

// Client-side sanitizer ensuring no residual store names, foreign prices, or UI elements appear
const cleanProductText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\b(compra\s+en|comprar\s+en|disponible\s+en|vendido\s+por|en|desde|de)\s+(temu|aliexpress|amazon|shein|ebay|shopee|mercadolibre|walmart)\b/gi, '')
    .replace(/\b(temu|aliexpress|amazon|shein|ebay|shopee|mercadolibre|walmart|alibaba|taobao|dhgate|wish)(\s+(españa|espana|mexico|méxico|usa|global|oficial|app|web|store|tienda))?\b/gi, '')
    .replace(/[|\-–—·]\s*(temu|aliexpress|amazon|shein|ebay|shopee|mercadolibre|walmart).*$/gi, '')
    .replace(/\b(envío\s+gratis|devolución\s+gratis|garantía|devoluciones?|mejor\s+vendido|más\s+vendido|top\s+ventas)\b/gi, '')
    .replace(/\b(comprar\s+ahora|añadir\s+a\s+la\s+cesta|agregar\s+al\s+carrito|ver\s+detalles|calificación|reseñas)\b/gi, '')
    .replace(/\b(usd|eur|cop|mxn|ars|clp|pen)\s*\$?\s*\d+([.,]\d+)?/gi, '')
    .replace(/\d+([.,]\d+)?\s*(usd|eur|cop|mxn|ars|clp|pen)\b/gi, '')
    .replace(/[\$€£¥]\s*\d+([.,]\d+)?/gi, '')
    .replace(/\d+([.,]\d+)?\s*[\$€£¥]/gi, '')
    .replace(/-\s*\d+%/g, '')
    .replace(/\d+%\s*(off|de\s*descuento)\b/gi, '')
    .replace(/\b(rebajas?|descuentos?|ofertas?|promoción|promociones?)\b/gi, '')
    .replace(/^[|·:–—\-,\s]+/, '')
    .replace(/[|·:–—\-,\s]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export default function ProductUploader({ onProductsUploaded, currency }: ProductUploaderProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('url'); // Default to URL to highlight this great feature!
  const [dragActive, setDragActive] = useState(false);
  const [priceInput, setPriceInput] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFiles = async (files: FileList) => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);

    const price = parseFloat(priceInput) || 0;
    const uploadedProducts: Product[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Solo se permiten archivos de imagen.');
        continue;
      }

      const localUrl = URL.createObjectURL(file);
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const tempProduct: Product = {
        id: tempId,
        name: `Escaneando ${file.name}...`,
        price: price,
        imageUrl: localUrl,
        imageAnalysisStatus: 'pending',
        category: 'General',
      };

      uploadedProducts.push(tempProduct);
    }

    onProductsUploaded(uploadedProducts);

    for (const tempProduct of uploadedProducts) {
      const fileIndex = uploadedProducts.indexOf(tempProduct);
      if (fileIndex === -1 || fileIndex >= files.length) continue;
      
      const file = files[fileIndex];
      tempProduct.imageAnalysisStatus = 'analyzing';
      onProductsUploaded([tempProduct]);

      try {
        const base64 = await fileToBase64(file);
        
        const response = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type,
            priceHint: price > 0 ? price : undefined,
            systemPrompt: STRICT_SYSTEM_PROMPT,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al analizar la imagen.');
        }

        const data = await response.json();

        const cleanName = cleanProductText(data.name || 'Producto Nuevo');
        const cleanDesc = cleanProductText(data.description || '');
        const cleanBrand = cleanProductText(data.attributes?.brand || '');

        const finalProduct: Product = {
          ...tempProduct,
          name: cleanName,
          description: cleanDesc,
          imageUrl: base64,
          price: price, // Strictly use the user's custom price
          imageAnalysisStatus: 'completed',
          imageQuality: data.imageQuality || 'Good',
          attributes: {
            colors: data.attributes?.colors || [],
            sizes: data.attributes?.sizes || [],
            brand: cleanBrand,
            model: data.attributes?.model || '',
            features: data.attributes?.features || [],
            sku: data.sku || `PROD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            availability: 'Disponible',
          },
        };

        onProductsUploaded([finalProduct]);
      } catch (error: any) {
        console.error('Error in product analysis:', error);
        const failedProduct: Product = {
          ...tempProduct,
          name: file.name.split('.')[0] || 'Producto Nuevo',
          imageAnalysisStatus: 'failed',
          attributes: {
            sku: `PROD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            availability: 'Disponible',
          },
        };
        onProductsUploaded([failedProduct]);
      }
    }

    setIsProcessing(false);
    setPriceInput('');
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setErrorMsg('Por favor introduce un enlace válido.');
      return;
    }

    if (!priceInput.trim() || parseFloat(priceInput) <= 0) {
      setErrorMsg('Por favor establece un precio de venta personalizado antes de importar.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    const price = parseFloat(priceInput) || 0;
    const tempId = `temp-url-${Date.now()}`;
    
    // Create a temporary item showing the analysis in progress
    const tempProduct: Product = {
      id: tempId,
      name: 'Buscando e importando desde enlace...',
      price: price,
      imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80',
      imageAnalysisStatus: 'analyzing',
      category: 'General',
    };

    onProductsUploaded([tempProduct]);

    try {
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput.trim(),
          priceHint: price,
          systemPrompt: STRICT_SYSTEM_PROMPT,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al importar producto desde el enlace.');
      }

      const data = await response.json();

      const cleanTitle = cleanProductText(data.name || 'Producto Importado');
      const cleanDesc = cleanProductText(data.description || '');
      const rawBrand = cleanProductText(data.attributes?.brand || 'Importado');
      const cleanBrand = rawBrand && !/^(temu|aliexpress|amazon|shein)$/i.test(rawBrand) ? rawBrand : 'Importado';

      const finalProduct: Product = {
        ...tempProduct,
        name: cleanTitle,
        description: cleanDesc,
        imageUrl: data.imageUrl || tempProduct.imageUrl,
        price: price, // Strictly lock to the user-specified selling price
        imageAnalysisStatus: 'completed',
        attributes: {
          colors: data.attributes?.colors || [],
          sizes: data.attributes?.sizes || [],
          brand: cleanBrand,
          model: data.attributes?.model || '',
          features: data.attributes?.features || [],
          sku: data.sku || `IMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          availability: 'Disponible',
        },
      };

      onProductsUploaded([finalProduct]);
      setUrlInput('');
      setPriceInput('');
    } catch (error: any) {
      console.error('Error in URL analysis:', error);
      setErrorMsg(`No se pudo importar el enlace: ${error.message}`);
      // Clean up temp product
      onProductsUploaded([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 space-y-4" id="product-uploader-panel">
      <div className="border-b border-neutral-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neutral-900 animate-pulse" />
            Cargador Inteligente de Productos
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Importa productos directamente con fotos de tu galería o copiando el enlace de páginas como Temu.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-neutral-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'url' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Pegar Enlace Temu/Web
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'file' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Cargar Fotos
          </button>
        </div>
      </div>

      {/* Inputs base */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* Precio personalizado (Obligatorio para que lo aplique al importar) */}
        <div className="md:col-span-4">
          <label className="block text-xs font-bold text-neutral-700 mb-1.5 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
            Mi Precio de Venta ({currency}) *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-xs font-semibold text-neutral-400">{currency === 'EUR' ? '€' : '$'}</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="Ej. 29.99"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Dynamic Area based on Active Tab */}
        <div className="md:col-span-8">
          {activeTab === 'url' ? (
            <form onSubmit={handleUrlImport} className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1">
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">Enlace del Producto (Temu, AliExpress, etc.)</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="url"
                    required
                    placeholder="https://www.temu.com/luxury-vintage-watch-p-123.html..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:bg-white transition"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isProcessing}
                className="bg-neutral-950 hover:bg-neutral-850 text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition self-end h-[42px] min-w-[120px] shadow"
              >
                Importar Producto
              </button>
            </form>
          ) : (
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">Subir Imágenes desde tu Dispositivo</label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleChange}
                className="hidden"
              />
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 flex items-center justify-center cursor-pointer transition h-[42px] ${
                  dragActive
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-neutral-200 hover:border-neutral-400 bg-neutral-50/50 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-neutral-500 animate-pulse" />
                  <p className="text-xs font-semibold text-neutral-700">
                    Suelte imágenes o <span className="underline text-neutral-900">explore archivos</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Tip Block */}
      <div className="bg-neutral-50 rounded-xl p-3 flex gap-2.5 items-start border border-neutral-100/50">
        <Info className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          {activeTab === 'url' 
            ? "Pega el enlace de Temu, AliExpress u otra tienda. El sistema extrae la foto original limpia del producto, elimina automáticamente marcas de agua, logos de plataformas y precios de origen, asegurando que tu catálogo muestre exclusivamente tu precio personalizado."
            : "Sube las fotos de tus productos directamente. Nuestro escáner de visión Gemini identificará el producto físico, omitirá marcas de agua o etiquetas y generará títulos comerciales limpios con tu precio de venta."
          }
        </p>
      </div>

      {/* Processing Animation Block */}
      {isProcessing && (
        <div className="bg-neutral-900 text-white rounded-xl p-4 flex items-center gap-3.5 shadow-md animate-fade-in">
          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
              Procesando tu solicitud en tiempo real con Inteligencia Artificial...
            </span>
            <p className="text-neutral-300 text-[10px] mt-0.5">
              {activeTab === 'url'
                ? "Buscando referencias en internet, localizando la imagen de alta resolución y extrayendo títulos comerciales."
                : "Analizando texturas, colores e identificando especificaciones técnicas del producto."}
            </p>
          </div>
        </div>
      )}

      {/* Error Message Block */}
      {errorMsg && (
        <div className="bg-red-50 text-red-700 text-xs rounded-xl p-3 flex items-center gap-2 border border-red-100">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
