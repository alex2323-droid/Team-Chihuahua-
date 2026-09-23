import React, { useState } from 'react';
import { BusinessInfo, CatalogSettings, Product } from '../types';
import { generateCatalogPdf } from '../utils/pdfExport';
import {
  FileDown,
  Printer,
  X,
  Check,
  LayoutGrid,
  List,
  Sparkles,
  HelpCircle,
  FileText,
  Loader2,
} from 'lucide-react';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: BusinessInfo;
  settings: CatalogSettings;
  products: Product[];
}

export default function PdfExportModal({
  isOpen,
  onClose,
  business,
  settings,
  products,
}: PdfExportModalProps) {
  const [includePrices, setIncludePrices] = useState(true);
  const [includeContact, setIncludeContact] = useState(true);
  const [includeSku, setIncludeSku] = useState(settings.showSku);
  const [includeAttributes, setIncludeAttributes] = useState(settings.showAttributes);
  const [layoutStyle, setLayoutStyle] = useState<'grid' | 'detailed'>('grid');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    setProgressMsg('Iniciando generación de PDF...');
    try {
      await generateCatalogPdf(business, settings, products, {
        includePrices,
        includeContact,
        includeSku,
        includeAttributes,
        layoutStyle,
        onProgress: (msg) => setProgressMsg(msg),
      });
      setTimeout(() => {
        setIsGenerating(false);
        setProgressMsg('');
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      alert('Hubo un inconveniente al generar el PDF. Puedes utilizar la opción de "Imprimir Catálogo".');
      setIsGenerating(false);
      setProgressMsg('');
    }
  };

  const handlePrint = () => {
    onClose();
    // Allow modal animation to finish before opening print dialog
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="bg-neutral-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <FileDown className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Exportar Catálogo a PDF</h3>
              <p className="text-xs text-neutral-400">
                Listo para imprimir en físico o compartir por WhatsApp y correo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary badge */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs">
            <div className="flex items-center gap-2 text-neutral-700 font-medium">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>{business.name || 'Catálogo Oficial'}</span>
            </div>
            <span className="bg-neutral-200/70 text-neutral-700 px-2.5 py-1 rounded-full font-bold">
              {products.length} {products.length === 1 ? 'producto' : 'productos'}
            </span>
          </div>

          {/* Configuration Options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Opciones del Documento
            </h4>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition">
                <span className="text-xs font-semibold text-neutral-800">
                  Incluir precios de venta ({settings.currency})
                </span>
                <input
                  type="checkbox"
                  checked={includePrices}
                  onChange={(e) => setIncludePrices(e.target.checked)}
                  className="w-4 h-4 accent-neutral-900 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition">
                <span className="text-xs font-semibold text-neutral-800">
                  Incluir contacto de la tienda (WhatsApp, Dirección, Redes)
                </span>
                <input
                  type="checkbox"
                  checked={includeContact}
                  onChange={(e) => setIncludeContact(e.target.checked)}
                  className="w-4 h-4 accent-neutral-900 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition">
                <span className="text-xs font-semibold text-neutral-800">
                  Incluir códigos SKU y atributos (tallas, colores)
                </span>
                <input
                  type="checkbox"
                  checked={includeSku}
                  onChange={(e) => {
                    setIncludeSku(e.target.checked);
                    setIncludeAttributes(e.target.checked);
                  }}
                  className="w-4 h-4 accent-neutral-900 rounded"
                />
              </label>
            </div>
          </div>

          {/* Layout Style Picker */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Diseño de Maquetación
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLayoutStyle('grid')}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                  layoutStyle === 'grid'
                    ? 'border-neutral-900 bg-neutral-900/5 ring-1 ring-neutral-900'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <div className="p-2 rounded-lg bg-neutral-100 text-neutral-800">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">Cuadrícula (2 Col)</p>
                  <p className="text-[11px] text-neutral-500">Tarjetas compactas estilo folleto</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLayoutStyle('detailed')}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                  layoutStyle === 'detailed'
                    ? 'border-neutral-900 bg-neutral-900/5 ring-1 ring-neutral-900'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <div className="p-2 rounded-lg bg-neutral-100 text-neutral-800">
                  <List className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">Lista Detallada</p>
                  <p className="text-[11px] text-neutral-500">Filas amplias con descripción</p>
                </div>
              </button>
            </div>
          </div>

          {/* Real-time Progress Bar when generating */}
          {isGenerating && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2 animate-pulse">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-800">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>{progressMsg || 'Generando archivo PDF listo para impresión...'}</span>
              </div>
              <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-4/5 animate-pulse rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            disabled={isGenerating}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Guardar Sistema
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGenerating || products.length === 0}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Descargar Archivo PDF (.pdf)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
