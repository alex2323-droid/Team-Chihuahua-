import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingBag,
  Lock,
  User,
  Store,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface SellerPortalProps {
  onSuccess?: () => void;
}

export default function SellerPortal({ onSuccess }: SellerPortalProps) {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regStoreName, setRegStoreName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginUsername.trim() || !loginPassword) {
      setErrorMessage('Por favor ingresa tu usuario y contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(loginUsername.trim(), loginPassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
      } else {
        setSuccessMessage('¡Bienvenido de nuevo!');
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setErrorMessage('Error al conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regUsername.trim() || regUsername.trim().length < 3) {
      setErrorMessage('El usuario debe tener al menos 3 caracteres.');
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setErrorMessage('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        username: regUsername.trim().toLowerCase(),
        password: regPassword,
        name: regName.trim() || regUsername.trim(),
        storeName: regStoreName.trim() || `Tienda ${regUsername.trim()}`,
        email: regEmail.trim() || `${regUsername.trim().toLowerCase()}@tienda.com`,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'No se pudo crear la cuenta.');
      } else {
        setSuccessMessage('¡Cuenta creada con éxito! Ingresando al panel...');
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setErrorMessage('Error al conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoginUsername('vendedor');
    setLoginPassword('123456');
    setErrorMessage(null);
    setIsSubmitting(true);
    const res = await login('vendedor', '123456');
    setIsSubmitting(false);
    if (res.success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-black text-neutral-900 dark:text-white flex flex-col justify-center items-center p-3 sm:p-6 transition-colors font-sans">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-radial-[at_top] from-neutral-200/50 via-transparent to-transparent dark:from-neutral-900/40 pointer-events-none" />

      <div className="relative w-full max-w-md mx-auto space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-2xl shadow-md">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Portal de Vendedores
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Crea, gestiona y publica tus catálogos interactivos
            </p>
          </div>
        </div>

        {/* Informative Notice (Explains this is exclusively for sellers) */}
        <div className="bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 flex items-start gap-2.5 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
            <strong className="text-neutral-900 dark:text-white">Acceso exclusivo para Vendedores.</strong> Tus clientes ingresan directamente mediante los enlaces de tus productos sin necesidad de registrarse.
          </p>
        </div>

        {/* Main Card Container */}
        <div className="bg-white dark:bg-[#0f0f11] border border-neutral-200 dark:border-neutral-800/80 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200/60 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Registrarse
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900/60 text-green-700 dark:text-green-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Usuario o Correo Electrónico
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Ej. vendedor o correo@tienda.com"
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Contraseña
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-bold text-xs py-3 px-4 rounded-xl transition shadow flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 min-h-[44px]"
              >
                {isSubmitting ? (
                  <span>Verificando credenciales...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar al Panel de Vendedor</span>
                  </>
                )}
              </button>

              {/* Quick Demo Access Helper */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isSubmitting}
                  className="w-full bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900/60 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-[11px] font-medium py-2 rounded-xl border border-neutral-200/80 dark:border-neutral-800 transition flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Acceso Rápido Demo (Usuario: <strong>vendedor</strong> / Clave: <strong>123456</strong>)</span>
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Nombre del Vendedor
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ej. Carlos Mendoza"
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Nombre de tu Tienda
                  </label>
                  <div className="relative">
                    <Store className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={regStoreName}
                      onChange={(e) => setRegStoreName(e.target.value)}
                      placeholder="Ej. Bella Vista Store"
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Usuario de Acceso *
                  </label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="Ej. carlos_ventas"
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Correo Electrónico (Opcional)
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="carlos@correo.com"
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={4}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-3 pr-8 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Confirmar Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={4}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repite tu contraseña"
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-3 pr-8 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-bold text-xs py-3 px-4 rounded-xl transition shadow flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 min-h-[44px]"
              >
                {isSubmitting ? (
                  <span>Registrando vendedor...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Crear Cuenta de Vendedor y Entrar</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] text-neutral-400 dark:text-neutral-500">
          Catálogo Inteligente &copy; {new Date().getFullYear()} • Autenticación Segura para Vendedores
        </p>
      </div>
    </div>
  );
}
