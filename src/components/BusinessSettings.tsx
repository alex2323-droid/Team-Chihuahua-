import React from 'react';
import { BusinessInfo, CatalogSettings } from '../types';
import { Store, Phone, Instagram, MapPin, Wallet, Palette, HelpCircle, Moon, Sun } from 'lucide-react';

interface BusinessSettingsProps {
  business: BusinessInfo;
  setBusiness: React.Dispatch<React.SetStateAction<BusinessInfo>>;
  settings: CatalogSettings;
  setSettings: React.Dispatch<React.SetStateAction<CatalogSettings>>;
}

const PALETTES = [
  { name: 'Negro Absoluto', primary: '#000000', secondary: '#ffffff' },
  { name: 'Azul Elegante', primary: '#1E3A8A', secondary: '#3B82F6' },
  { name: 'Esmeralda Orgánico', primary: '#064E3B', secondary: '#10B981' },
  { name: 'Terracota Cálido', primary: '#7C2D12', secondary: '#F97316' },
  { name: 'Oro Negro Lujoso', primary: '#1F2937', secondary: '#F59E0B' },
  { name: 'Rosa Vibrante', primary: '#9D174D', secondary: '#EC4899' },
];

const THEMES = [
  { id: 'dark', name: 'Modo Oscuro', desc: 'Negro y blanco de alto contraste' },
  { id: 'light', name: 'Luz Elegante', desc: 'Fondo claro y contrastes nítidos' },
  { id: 'premium', name: 'Premium Oscuro', desc: 'Fondo de lujo para destacar productos selectos' },
  { id: 'minimalist', name: 'Minimalista', desc: 'Sin bordes ni adornos, el producto es rey' },
  { id: 'retro', name: 'Retro Cálido', desc: 'Inspiración clásica con un toque de calidez' },
];

export default function BusinessSettings({
  business,
  setBusiness,
  settings,
  setSettings,
}: BusinessSettingsProps) {
  const handlePaymentToggle = (method: string) => {
    setBusiness((prev) => {
      const paymentMethods = prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter((m) => m !== method)
        : [...prev.paymentMethods, method];
      return { ...prev, paymentMethods };
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusiness((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm p-6 space-y-6 transition-colors" id="business-settings-panel">
      <div className="border-b border-neutral-100 dark:border-neutral-850 pb-4">
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
          <Store className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          Datos del Negocio
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Configura la identidad de tu marca para que tus clientes te identifiquen al instante.
        </p>
      </div>

      {/* Identidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-350 mb-1">Nombre del Negocio *</label>
          <div className="relative">
            <Store className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
            <input
              type="text"
              required
              placeholder="Ej. Boutique Bella Vista"
              value={business.name || ''}
              onChange={(e) => setBusiness((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-800 focus:bg-white dark:focus:bg-black transition text-neutral-800 dark:text-neutral-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-350 mb-1">WhatsApp para Pedidos *</label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
            <input
              type="tel"
              required
              placeholder="Ej. 5491123456789 (incluye código de país)"
              value={business.whatsapp || ''}
              onChange={(e) => setBusiness((prev) => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, '') }))}
              className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-800 focus:bg-white dark:focus:bg-black transition text-neutral-800 dark:text-neutral-100"
            />
          </div>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block mt-1">
            Solo números, incluye código de país (sin el + ni espacios).
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-350 mb-1">Instagram (@usuario)</label>
          <div className="relative">
            <Instagram className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Ej. boutique_bellavista"
              value={business.instagram || ''}
              onChange={(e) => setBusiness((prev) => ({ ...prev, instagram: e.target.value.replace('@', '') }))}
              className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-800 focus:bg-white dark:focus:bg-black transition text-neutral-800 dark:text-neutral-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-350 mb-1">Dirección Física (Opcional)</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
            <input
              type="text"
              placeholder="Ej. Av. Siempreviva 742, Springfield"
              value={business.address || ''}
              onChange={(e) => setBusiness((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-800 focus:bg-white dark:focus:bg-black transition text-neutral-800 dark:text-neutral-100"
            />
          </div>
        </div>
      </div>

      {/* Logo & Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-350 mb-1">Logotipo del Negocio</label>
          <div className="flex items-center gap-3">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt="Logo preview"
                className="w-12 h-12 rounded-lg object-cover border border-neutral-100 dark:border-neutral-800"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-[10px] text-neutral-400 dark:text-neutral-500 font-bold">
                LOGO
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                id="logo-file-picker"
                className="hidden"
              />
              <label
                htmlFor="logo-file-picker"
                className="cursor-pointer inline-flex items-center justify-center px-3 py-1.5 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition"
              >
                Subir Imagen
              </label>
              {business.logoUrl && (
                <button
                  type="button"
                  onClick={() => setBusiness((prev) => ({ ...prev, logoUrl: undefined }))}
                  className="text-xs text-red-500 hover:text-red-600 ml-3 font-medium"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-350 mb-1">Moneda del Catálogo</label>
          <select
            value={settings.currency}
            onChange={(e) => setSettings((prev) => ({ ...prev, currency: e.target.value }))}
            className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-800 focus:bg-white dark:focus:bg-black transition text-neutral-800 dark:text-neutral-100"
          >
            <option value="USD">Dólar ($ USD)</option>
            <option value="MXN">Peso Mexicano ($ MXN)</option>
            <option value="COP">Peso Colombiano ($ COP)</option>
            <option value="ARS">Peso Argentino ($ ARS)</option>
            <option value="CLP">Peso Chileno ($ CLP)</option>
            <option value="PEN">Sol Peruano (S/ PEN)</option>
            <option value="EUR">Euro (€ EUR)</option>
            <option value="GTQ">Quetzal Guatemalteco (Q GTQ)</option>
            <option value="BOB">Boliviano (Bs BOB)</option>
            <option value="UYU">Peso Uruguayo ($ UYU)</option>
          </select>
        </div>
      </div>

      {/* Métodos de Pago */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-350 mb-2 flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          Métodos de Pago Aceptados
        </label>
        <div className="flex flex-wrap gap-2">
          {['Efectivo', 'Transferencia Bancaria', 'Tarjeta de Crédito/Débito', 'Pago Móvil / Bizum', 'PayPal', 'Mercado Pago'].map((method) => {
            const isSelected = business.paymentMethods.includes(method);
            return (
              <button
                key={method}
                type="button"
                onClick={() => handlePaymentToggle(method)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  isSelected
                    ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-900'
                    : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-850'
                }`}
              >
                {method}
              </button>
            );
          })}
        </div>
      </div>

      {/* Información Adicional */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-350 mb-1">Instrucciones de Compra o Entrega</label>
        <textarea
          rows={2}
          placeholder="Ej. Hacemos envíos nacionales gratis por compras mayores a $50. Pedidos se entregan en 24-48 horas hábiles."
          value={business.additionalInfo || ''}
          onChange={(e) => setBusiness((prev) => ({ ...prev, additionalInfo: e.target.value }))}
          className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-800 focus:bg-white dark:focus:bg-black transition resize-none text-neutral-800 dark:text-neutral-100"
        />
      </div>

      {/* Configuración de Diseño */}
      <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
              <Palette className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              Apariencia del Catálogo
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Personaliza los colores, la distribución y el tema visual del catálogo.
            </p>
          </div>

          {/* Quick Dark Mode Toggle Switch */}
          <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-950 p-2 rounded-xl border border-neutral-200/50 dark:border-neutral-800">
            <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-1">
              {settings.theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-yellow-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
              Modo Oscuro (Negro/Blanco)
            </span>
            <button
              type="button"
              onClick={() => {
                const isDark = settings.theme === 'dark';
                setSettings(prev => ({
                  ...prev,
                  theme: isDark ? 'light' : 'dark',
                  primaryColor: isDark ? '#111827' : '#000000',
                  secondaryColor: isDark ? '#3B82F6' : '#ffffff',
                }));
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.theme === 'dark' ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-250'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black shadow ring-0 transition duration-200 ease-in-out ${
                  settings.theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Paletas Preestablecidas */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-350 mb-2">Paleta de Colores de Marca</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PALETTES.map((palette) => {
              const isSelected = settings.primaryColor === palette.primary;
              return (
                <button
                  key={palette.name}
                  type="button"
                  onClick={() => setSettings((prev) => ({
                    ...prev,
                    primaryColor: palette.primary,
                    secondaryColor: palette.secondary,
                  }))}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition ${
                    isSelected 
                      ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-950' 
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850'
                  }`}
                >
                  <div className="flex gap-1">
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10" style={{ backgroundColor: palette.primary }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10" style={{ backgroundColor: palette.secondary }} />
                  </div>
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">{palette.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <label className="text-[10px] text-neutral-500 block mb-0.5">Color Primario Personalizado</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.primaryColor || '#000000'}
                  onChange={(e) => setSettings((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-8 h-8 rounded border border-neutral-200 dark:border-neutral-800 cursor-pointer p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={settings.primaryColor || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-20 px-2 py-1 text-xs border border-neutral-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-950 text-center font-mono text-neutral-800 dark:text-neutral-200"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-neutral-500 block mb-0.5">Color Secundario Personalizado</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.secondaryColor || '#ffffff'}
                  onChange={(e) => setSettings((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-8 h-8 rounded border border-neutral-200 dark:border-neutral-800 cursor-pointer p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={settings.secondaryColor || ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-20 px-2 py-1 text-xs border border-neutral-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-950 text-center font-mono text-neutral-800 dark:text-neutral-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Estilo de Maquetación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-350 mb-1.5">Distribución de Productos</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, layout: 'grid' }))}
                className={`py-2 px-3 border rounded-lg text-xs font-medium transition ${
                  settings.layout === 'grid' 
                    ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-900' 
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-850 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-850'
                }`}
              >
                Cuadrícula (Mosaico)
              </button>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, layout: 'list' }))}
                className={`py-2 px-3 border rounded-lg text-xs font-medium transition ${
                  settings.layout === 'list' 
                    ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-900' 
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-850 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-850'
                }`}
              >
                Lista Detallada
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-350 mb-1.5">Opciones de Detalle</label>
            <div className="space-y-1.5 mt-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={settings.showSku}
                  onChange={(e) => setSettings((prev) => ({ ...prev, showSku: e.target.checked }))}
                  className="rounded border-neutral-300 dark:border-neutral-800 text-neutral-900 focus:ring-neutral-500 w-4 h-4"
                />
                Mostrar código SKU autogenerado
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={settings.showAttributes}
                  onChange={(e) => setSettings((prev) => ({ ...prev, showAttributes: e.target.checked }))}
                  className="rounded border-neutral-300 dark:border-neutral-800 text-neutral-900 focus:ring-neutral-500 w-4 h-4"
                />
                Mostrar atributos (tallas, colores, marca)
              </label>
            </div>
          </div>
        </div>

        {/* Temas Visuales */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-350 mb-2">Tema de Fondo y Estilo</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {THEMES.map((theme) => {
              const isSelected = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSettings((prev) => {
                    const primaryColor = theme.id === 'dark' ? '#000000' : (theme.id === 'premium' ? '#1f2937' : '#111827');
                    const secondaryColor = theme.id === 'dark' ? '#ffffff' : (theme.id === 'premium' ? '#f59e0b' : '#3b82f6');
                    return {
                      ...prev,
                      theme: theme.id as any,
                      primaryColor,
                      secondaryColor,
                    };
                  })}
                  className={`p-3 border rounded-lg text-left transition ${
                    isSelected 
                      ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-950' 
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850'
                  }`}
                >
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">{theme.name}</p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">{theme.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
