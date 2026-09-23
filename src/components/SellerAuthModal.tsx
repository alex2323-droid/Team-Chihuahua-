import React, { useState } from 'react';
import { X, Lock, User, RefreshCw, Sparkles, CheckCircle } from 'lucide-react';
import { Catalog } from '../types';

interface SellerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string, catalog: Catalog) => void;
}

export default function SellerAuthModal({ isOpen, onClose, onSuccess }: SellerAuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Por favor, completa todos los campos.');
      return;
    }

    setLoading(true);
    const endpoint = isRegister ? '/api/seller/register' : '/api/seller/login';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error al procesar tu solicitud.');
      }

      if (isRegister) {
        setSuccessMsg('¡Usuario registrado con éxito! Iniciando sesión...');
        setTimeout(() => {
          onSuccess(data.username, data.catalog);
          onClose();
        }, 1500);
      } else {
        onSuccess(data.username, data.catalog);
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-neutral-900 dark:text-neutral-100 transition-colors">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold tracking-tight">
            {isRegister ? 'Registro de Vendedor' : 'Acceso Vendedores'}
          </h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {isRegister 
              ? 'Crea tu cuenta de vendedor para guardar tus productos en la nube de forma permanente.' 
              : 'Inicia sesión para sincronizar tus catálogos y productos en cualquier dispositivo.'}
          </p>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs rounded-xl p-3 border border-red-100 dark:border-red-900/50">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-xs rounded-xl p-3 border border-green-100 dark:border-green-900/50 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Nombre de Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                required
                disabled={loading}
                placeholder="Ej. boutique_bellavista"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white focus:bg-white dark:focus:bg-black text-neutral-800 dark:text-neutral-100 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="password"
                required
                disabled={loading}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white focus:bg-white dark:focus:bg-black text-neutral-800 dark:text-neutral-100 transition"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isRegister ? 'Registrarse y Comenzar' : 'Entrar al Panel'}</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="pt-2 text-center text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800">
          <span>
            {isRegister ? '¿Ya tienes una cuenta?' : '¿Eres un vendedor nuevo?'}
          </span>{' '}
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="text-neutral-900 dark:text-white font-bold hover:underline"
          >
            {isRegister ? 'Iniciar Sesión' : 'Regístrate Aquí'}
          </button>
        </div>

      </div>
    </div>
  );
}
