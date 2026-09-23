import React, { useState, useEffect, useRef } from 'react';
import { BusinessInfo, CatalogSettings } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  Phone,
  Instagram,
  MapPin,
  Wallet,
  Palette,
  Save,
  Check,
  Upload,
  Trash2,
  Mail,
  RefreshCw,
  Sparkles,
  Info,
  Moon,
  Sun,
  LayoutGrid,
  UserCheck,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { compressLogoImage, saveStoreProfile } from '../utils/storeProfile';

interface BusinessSettingsProps {
  business: BusinessInfo;
  setBusiness: React.Dispatch<React.SetStateAction<BusinessInfo>>;
  settings: CatalogSettings;
  setSettings: React.Dispatch<React.SetStateAction<CatalogSettings>>;
  onSaveNotification?: (msg: string) => void;
}

const PALETTES = [
  { name: 'Monocromo Negro/Blanco', primary: '#000000', secondary: '#71717A' },
  { name: 'Azul Elegante', primary: '#1E3A8A', secondary: '#3B82F6' },
  { name: 'Esmeralda Orgánico', primary: '#064E3B', secondary: '#10B981' },
  { name: 'Terracota Cálido', primary: '#7C2D12', secondary: '#F97316' },
  { name: 'Oro Negro Lujoso', primary: '#1F2937', secondary: '#F59E0B' },
  { name: 'Rosa Vibrante', primary: '#9D174D', secondary: '#EC4899' },
];

const THEMES = [
  { id: 'light', name: 'Luz Elegante (Claro)', desc: 'Fondo claro minimalista y contrastes nítidos' },
  { id: 'dark', name: 'Dark Negro y Blanco (Oscuro)', desc: 'Contraste puro azabache, elegante y moderno' },
  { id: 'premium', name: 'Premium Oscuro', desc: 'Fondo de lujo para destacar productos selectos' },
  { id: 'minimalist', name: 'Minimalista Puro', desc: 'Sin bordes ni distracciones, producto en primer plano' },
];

export default function BusinessSettings({
  business,
  setBusiness,
  settings,
  setSettings,
  onSaveNotification,
}: BusinessSettingsProps) {
  const { seller, logout } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'unsaved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFirstRender = useRef(true);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDarkMode = Boolean(
    settings.darkMode ||
    settings.theme === 'dark' ||
    settings.theme === 'premium'
  );

  // Toggle dark mode via interruptor
  const handleToggleDarkMode = (enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      darkMode: enabled,
      theme: enabled ? 'dark' : 'light',
    }));
  };

  // Mark as unsaved and trigger auto-save debounce on changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setSaveStatus('unsaved');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Auto-save after 1.5 seconds of inactivity
    autoSaveTimerRef.current = setTimeout(() => {
      handleManualSave(true);
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [business, settings]);

  // Save changes explicitly
  const handleManualSave = async (isAutoSave = false) => {
    if (!business.name?.trim()) return;

    if (!isAutoSave) {
      setIsSaving(true);
    }
    setSaveStatus('saving');

    try {
      const result = await saveStoreProfile(business, settings);
      setSaveStatus('saved');
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(timeStr);

      if (!isAutoSave) {
        setToastMessage(result.message || '¡Configuración y contactos guardados con éxito!');
        onSaveNotification?.(result.message);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err: any) {
      console.error('Error saving store profile:', err);
      setSaveStatus('unsaved');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePaymentToggle = (method: string) => {
    setBusiness((prev) => {
      const paymentMethods = prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter((m) => m !== method)
        : [...prev.paymentMethods, method];
      return { ...prev, paymentMethods };
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      // Compress and optimize logo to max 360x360 px canvas
      const compressedDataUrl = await compressLogoImage(file, 360);
      setBusiness((prev) => ({ ...prev, logoUrl: compressedDataUrl }));

      // Immediately persist with the new logo
      await saveStoreProfile(
        { ...business, logoUrl: compressedDataUrl },
        settings
      );
      setSaveStatus('saved');
      setToastMessage('¡Logotipo actualizado y guardado correctamente!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Error uploading logo:', err);
      alert('No se pudo procesar la imagen del logotipo. Intenta con otra imagen.');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setBusiness((prev) => ({ ...prev, logoUrl: undefined }));
    await saveStoreProfile(
      { ...business, logoUrl: undefined },
      settings
    );
    setSaveStatus('saved');
    setToastMessage('Logotipo eliminado y cambios guardados.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div
      className="bg-white dark:bg-[#0e0e10] rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm p-6 space-y-6 transition-colors"
      id="business-settings-panel"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-bold ml-2 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Header & Save Button Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            Configuración de la Tienda y Contactos
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Personaliza el nombre, medios de contacto, logo y tema visual de tu catálogo digital.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Status badge */}
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            {saveStatus === 'saving' ? (
              <>
                <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  {lastSavedTime ? `Guardado (${lastSavedTime})` : 'Guardado'}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Cambios sin guardar</span>
              </>
            )}
          </div>

          {/* Primary Save Button */}
          <button
            type="button"
            onClick={() => handleManualSave(false)}
            disabled={isSaving}
            className="bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black text-xs font-semibold px-4 py-2 rounded-lg transition inline-flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* 0.1 INFORMACIÓN DEL VENDEDOR AUTENTICADO */}
      {seller && (
        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {seller.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                  {seller.name}
                </span>
                <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Vendedor Verificado
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Usuario: <span className="font-mono text-neutral-700 dark:text-neutral-300">@{seller.username}</span> • Correo: <span className="text-neutral-700 dark:text-neutral-300">{seller.email}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="self-start sm:self-auto bg-white hover:bg-red-50 dark:bg-neutral-800 dark:hover:bg-red-950/40 text-neutral-700 hover:text-red-600 dark:text-neutral-300 dark:hover:text-red-400 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}

      {/* 0.2 SECCIÓN DESTACADA: INTERRUPTOR DE MODO OSCURO NEGRO Y BLANCO */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-black/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 shadow-2xs">
            {isDarkMode ? <Moon className="w-5 h-5 text-amber-300" /> : <Sun className="w-5 h-5 text-amber-500" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Tema Modo Oscuro (Dark Negro y Blanco)
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isDarkMode 
                  ? 'bg-neutral-900 text-white border-neutral-700 dark:bg-white dark:text-black dark:border-white' 
                  : 'bg-neutral-200 text-neutral-700 border-neutral-300'
              }`}>
                {isDarkMode ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Aplica la paleta monocromática oscura de alto contraste a toda la interfaz y catálogo.
            </p>
          </div>
        </div>

        {/* Modern Interactive Switch (Interruptor) */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 select-none">
            {isDarkMode ? 'Oscuro' : 'Claro'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isDarkMode}
            onClick={() => handleToggleDarkMode(!isDarkMode)}
            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 ${
              isDarkMode ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300'
            }`}
          >
            <span className="sr-only">Activar modo oscuro</span>
            <span
              className={`pointer-events-none flex h-6 w-6 transform items-center justify-center rounded-full bg-white dark:bg-black shadow-md ring-0 transition duration-200 ease-in-out ${
                isDarkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {isDarkMode ? (
                <Moon className="w-3.5 h-3.5 text-white fill-white" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* 1. SECCIÓN: IDENTIDAD Y LOGOTIPO */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Identidad de la Marca
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Nombre de la Tienda / Negocio *
            </label>
            <div className="relative">
              <Store className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                required
                placeholder="Ej. Boutique Bella Vista"
                value={business.name}
                onChange={(e) => setBusiness((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 focus:bg-white dark:focus:bg-black transition"
              />
            </div>
          </div>

          {/* Logotipo del Negocio */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Logotipo del Negocio
            </label>
            <div className="flex items-center gap-3 p-2 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50/60 dark:bg-neutral-900/60">
              {business.logoUrl ? (
                <div className="relative group shrink-0">
                  <img
                    src={business.logoUrl}
                    alt="Logo tienda"
                    className="w-12 h-12 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition"
                    title="Eliminar logo"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white dark:bg-black border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-[10px] text-neutral-400 font-bold shrink-0">
                  LOGO
                </div>
              )}

              <div className="flex-1 min-w-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  id="store-logo-file-picker"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="store-logo-file-picker"
                    className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition shadow-2xs"
                  >
                    {isUploadingLogo ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-neutral-500" />
                        <span>Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                        <span>{business.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}</span>
                      </>
                    )}
                  </label>

                  {business.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium px-2 py-1 transition"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 truncate">
                  JPG, PNG o WebP. Se optimiza y comprime automáticamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN: DATOS DE CONTACTO Y PEDIDOS */}
      <div className="space-y-4 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Medios de Contacto y Pedidos
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              WhatsApp para Recibir Pedidos *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <input
                type="tel"
                required
                placeholder="Ej. 34600123456 (incluye código país)"
                value={business.whatsapp}
                onChange={(e) => setBusiness((prev) => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, '') }))}
                className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 focus:bg-white dark:focus:bg-black transition font-mono"
              />
            </div>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block mt-1">
              Solo números con código de país (ej. España 34, México 52, Colombia 57, Argentina 54).
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Teléfono Alternativo / Fijo (Opcional)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="tel"
                placeholder="Ej. +34 912 345 678"
                value={business.phone || ''}
                onChange={(e) => setBusiness((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 focus:bg-white dark:focus:bg-black transition"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Correo Electrónico de Contacto
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="email"
                placeholder="contacto@tutienda.com"
                value={business.email || ''}
                onChange={(e) => setBusiness((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 focus:bg-white dark:focus:bg-black transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Instagram (@usuario)
            </label>
            <div className="relative">
              <Instagram className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Ej. boutique_bellavista"
                value={business.instagram || ''}
                onChange={(e) => setBusiness((prev) => ({ ...prev, instagram: e.target.value.replace('@', '') }))}
                className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 focus:bg-white dark:focus:bg-black transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Dirección Física / Ciudad
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Ej. Calle Mayor 12, Madrid"
                value={business.address || ''}
                onChange={(e) => setBusiness((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 focus:bg-white dark:focus:bg-black transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECCIÓN: MONEDA Y MÉTODOS DE PAGO */}
      <div className="space-y-4 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Pagos y Condiciones
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Moneda Principal del Catálogo
            </label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings((prev) => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 focus:bg-white dark:focus:bg-black transition"
            >
              <option value="EUR">Euro (€ EUR)</option>
              <option value="USD">Dólar ($ USD)</option>
              <option value="MXN">Peso Mexicano ($ MXN)</option>
              <option value="COP">Peso Colombiano ($ COP)</option>
              <option value="ARS">Peso Argentino ($ ARS)</option>
              <option value="CLP">Peso Chileno ($ CLP)</option>
              <option value="PEN">Sol Peruano (S/ PEN)</option>
              <option value="GTQ">Quetzal Guatemalteco (Q GTQ)</option>
              <option value="BOB">Boliviano (Bs BOB)</option>
              <option value="UYU">Peso Uruguayo ($ UYU)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-neutral-500" />
              Métodos de Pago Aceptados
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['Efectivo', 'Transferencia Bancaria', 'Tarjeta de Crédito/Débito', 'Pago Móvil / Bizum', 'PayPal', 'Mercado Pago'].map((method) => {
                const isSelected = business.paymentMethods.includes(method);
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => handlePaymentToggle(method)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                      isSelected
                        ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-black shadow-2xs'
                        : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {method}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Instrucciones de Compra o Entrega
          </label>
          <textarea
            rows={2}
            placeholder="Ej. Envíos a domicilio en 24-48 horas hábiles. Envíos gratis por compras superiores a €50."
            value={business.additionalInfo || ''}
            onChange={(e) => setBusiness((prev) => ({ ...prev, additionalInfo: e.target.value }))}
            className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 focus:bg-white dark:focus:bg-black transition resize-none"
          />
        </div>
      </div>

      {/* 4. SECCIÓN: DISEÑO Y APARIENCIA DEL CATÁLOGO */}
      <div className="border-t border-neutral-100 dark:border-neutral-800/80 pt-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-neutral-500" />
            Apariencia Visual y Tema del Catálogo
          </h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
            Personaliza los colores de marca, el tema (Dark Negro y Blanco / Luz) y la distribución del catálogo.
          </p>
        </div>

        {/* Temas Visuales */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">Tema y Estilo de Fondo</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {THEMES.map((theme) => {
              const isSelected = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    const isDarkSelected = theme.id === 'dark' || theme.id === 'premium';
                    setSettings((prev) => ({
                      ...prev,
                      theme: theme.id as any,
                      darkMode: isDarkSelected,
                    }));
                  }}
                  className={`p-3 border rounded-xl text-left transition flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-900 shadow-2xs ring-1 ring-neutral-900 dark:ring-white'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      {theme.name}
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{theme.desc}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Paletas de Colores */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Paleta de Colores de Marca
          </label>
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
                      ? 'border-neutral-900 dark:border-white bg-neutral-100 dark:bg-neutral-900 shadow-2xs'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex gap-1 shrink-0">
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20" style={{ backgroundColor: palette.primary }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20" style={{ backgroundColor: palette.secondary }} />
                  </div>
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">{palette.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div className="flex-1">
              <label className="text-[10px] text-neutral-500 dark:text-neutral-400 block mb-0.5">Color Primario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-8 h-8 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-24 px-2 py-1 text-xs border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-center font-mono"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-neutral-500 dark:text-neutral-400 block mb-0.5">Color Secundario</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-8 h-8 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                  className="w-24 px-2 py-1 text-xs border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-center font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Distribución y Opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Distribución de Productos</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, layout: 'grid' }))}
                className={`py-2 px-3 border rounded-lg text-xs font-medium transition ${
                  settings.layout === 'grid'
                    ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-black'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                Cuadrícula (Mosaico)
              </button>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, layout: 'list' }))}
                className={`py-2 px-3 border rounded-lg text-xs font-medium transition ${
                  settings.layout === 'list'
                    ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-black'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                Lista Detallada
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Opciones de Tarjetas</label>
            <div className="space-y-1.5 mt-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={settings.showSku}
                  onChange={(e) => setSettings((prev) => ({ ...prev, showSku: e.target.checked }))}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-500 w-4 h-4 accent-neutral-900 dark:accent-white"
                />
                Mostrar código SKU autogenerado
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={settings.showAttributes}
                  onChange={(e) => setSettings((prev) => ({ ...prev, showAttributes: e.target.checked }))}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-neutral-500 w-4 h-4 accent-neutral-900 dark:accent-white"
                />
                Mostrar atributos (tallas, colores, marca)
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM BAR - GUARDAR CONFIGURACIÓN */}
      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
          Los datos y la preferencia de tema se guardan tanto en tu navegador como en el servidor.
        </p>

        <button
          type="button"
          onClick={() => handleManualSave(false)}
          disabled={isSaving}
          className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-semibold px-5 py-2.5 rounded-lg transition inline-flex items-center justify-center gap-2 shadow active:scale-95 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Guardando Configuración...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Configuración y Tema</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
