import React, { useState } from 'react';
import { BusinessInfo, CatalogSettings, Product } from '../types';
import {
  FileDown,
  Printer,
  X,
  Check,
  Columns,
  LayoutGrid,
  List,
  Sparkles,
  Info,
  Phone,
  Mail,
  MapPin,
  Instagram,
  QrCode,
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
  const [columns, setColumns] = useState<2 | 3 | 4>(3);
  const [includeCover, setIncludeCover] = useState<boolean>(true);
  const [includePrices, setIncludePrices] = useState<boolean>(true);
  const [includeSkus, setIncludeSkus] = useState<boolean>(true);
  const [includeAttributes, setIncludeAttributes] = useState<boolean>(true);
  const [includeContactFooter, setIncludeContactFooter] = useState<boolean>(true);
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    setIsGenerating(true);
    setTimeout(() => {
      window.print();
      setIsGenerating(false);
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0e0e10] text-neutral-900 dark:text-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 relative space-y-5 my-8 transition-colors">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <FileDown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Exportar Catálogo en PDF / Imprimir
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Genera un documento maquetado profesionalmente para enviar a clientes o imprimir en alta calidad.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Column Layout */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Distribución de Cuadrícula (Columnas)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setColumns(2)}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition ${
                  columns === 2
                    ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
              >
                <Columns className="w-4 h-4" />
                <span>2 Columnas</span>
                <span className="text-[10px] text-neutral-400">Fotos grandes</span>
              </button>

              <button
                type="button"
                onClick={() => setColumns(3)}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition ${
                  columns === 3
                    ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>3 Columnas</span>
                <span className="text-[10px] text-neutral-400">Recomendado</span>
              </button>

              <button
                type="button"
                onClick={() => setColumns(4)}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition ${
                  columns === 4
                    ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>4 Columnas</span>
                <span className="text-[10px] text-neutral-400">Compacto</span>
              </button>
            </div>

            {/* Paper format */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Tamaño de Papel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaperSize('A4')}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition ${
                    paperSize === 'A4'
                      ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  A4 Estándar (210 x 297 mm)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize('Letter')}
                  className={`py-1.5 px-3 rounded-lg border text-xs font-semibold transition ${
                    paperSize === 'Letter'
                      ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Carta / Letter (8.5 x 11 pulg)
                </button>
              </div>
            </div>
          </div>

          {/* Content Checklist */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Contenido a Incluir en el Documento
            </label>
            <div className="space-y-2 bg-neutral-50 dark:bg-black/50 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={includeCover}
                  onChange={(e) => setIncludeCover(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-500 w-4 h-4 accent-neutral-900 dark:accent-white"
                />
                <span>Cabecera con logo y datos de la tienda</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={includePrices}
                  onChange={(e) => setIncludePrices(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-500 w-4 h-4 accent-neutral-900 dark:accent-white"
                />
                <span>Precios de venta ({settings.currency})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={includeSkus}
                  onChange={(e) => setIncludeSkus(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-500 w-4 h-4 accent-neutral-900 dark:accent-white"
                />
                <span>Códigos SKU de referencia</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={includeAttributes}
                  onChange={(e) => setIncludeAttributes(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-500 w-4 h-4 accent-neutral-900 dark:accent-white"
                />
                <span>Detalles (tallas, colores, disponibilidad)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={includeContactFooter}
                  onChange={(e) => setIncludeContactFooter(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-500 w-4 h-4 accent-neutral-900 dark:accent-white"
                />
                <span>Pie de página con instrucciones de compra</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-bold">Consejo para guardar como PDF:</span> Al hacer clic en{' '}
            <em>"Generar PDF / Imprimir"</em>, se abrirá el diálogo del sistema. Selecciona en Destino{' '}
            <strong>"Guardar como PDF"</strong> para obtener tu archivo descargable listo para enviar por WhatsApp o correo.
          </p>
        </div>

        {/* Summary Info */}
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <span>{products.length} productos listos para maquetar</span>
          <span>Formato: {paperSize} • {columns} Columnas</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isGenerating}
            className="bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-bold px-6 py-2.5 rounded-xl transition inline-flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>{isGenerating ? 'Preparando...' : 'Generar PDF / Imprimir'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
