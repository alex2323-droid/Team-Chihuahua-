import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product } from '../types';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Move,
} from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProductId: string | null;
  currency?: string;
  primaryColor?: string;
}

export default function ImageLightboxModal({
  isOpen,
  onClose,
  products,
  initialProductId,
  currency = 'USD',
  primaryColor = '#111827',
}: ImageLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // References for drag and pinch tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchDistanceRef = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);

  // Set current index when opening with an initial product
  useEffect(() => {
    if (initialProductId && products.length > 0) {
      const idx = products.findIndex((p) => p.id === initialProductId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [initialProductId, products]);

  // Reset zoom & pan when product changes or modal opens
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setImageLoaded(false);
    setImageError(false);
  }, [currentIndex, isOpen]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const currentProduct = products[currentIndex] || null;

  // Zoom handlers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Double tap / double click to toggle zoom
  const handleDoubleTap = (clientX?: number, clientY?: number) => {
    if (scale > 1) {
      handleResetZoom();
    } else {
      setScale(2.5);
      // Optional subtle shift towards tapped area
      if (clientX !== undefined && clientY !== undefined && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = (rect.width / 2 - clientX) * 0.8;
        const offsetY = (rect.height / 2 - clientY) * 0.8;
        setPosition({ x: offsetX, y: offsetY });
      }
    }
  };

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (products.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : products.length - 1));
  }, [products.length]);

  const handleNext = useCallback(() => {
    if (products.length <= 1) return;
    setCurrentIndex((prev) => (prev < products.length - 1 ? prev + 1 : 0));
  }, [products.length]);

  // Keyboard navigation & Shortcuts (ESC, Arrows, +, -)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // -------------------------------------------------------------
  // MOUSE DRAG & PAN
  // -------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click
    if (e.button !== 0) return;
    if (scale <= 1) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();

    const maxPanX = (window.innerWidth * (scale - 1)) / 1.8;
    const maxPanY = (window.innerHeight * (scale - 1)) / 1.8;

    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;

    setPosition({
      x: Math.min(Math.max(newX, -maxPanX), maxPanX),
      y: Math.min(Math.max(newY, -maxPanY), maxPanY),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom centered on cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = Math.min(Math.max(prev + zoomFactor, 1), 4);
      if (next === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // -------------------------------------------------------------
  // TOUCH EVENTS (PINCH-TO-ZOOM, PAN, & SWIPE)
  // -------------------------------------------------------------
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch started
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      lastTouchDistanceRef.current = dist;
    } else if (e.touches.length === 1) {
      // Single finger: check for double tap
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        handleDoubleTap(e.touches[0].clientX, e.touches[0].clientY);
      }
      lastTapRef.current = now;

      // Pan or swipe initiation
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (scale > 1) {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistanceRef.current !== null) {
      // Handle Pinch to Zoom
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / lastTouchDistanceRef.current;
      lastTouchDistanceRef.current = dist;

      setScale((prev) => {
        const next = Math.min(Math.max(prev * ratio, 1), 4);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Handle Single Finger Pan when zoomed in
      e.preventDefault();
      const maxPanX = (window.innerWidth * (scale - 1)) / 1.8;
      const maxPanY = (window.innerHeight * (scale - 1)) / 1.8;

      const newX = e.touches[0].clientX - dragStartRef.current.x;
      const newY = e.touches[0].clientY - dragStartRef.current.y;

      setPosition({
        x: Math.min(Math.max(newX, -maxPanX), maxPanX),
        y: Math.min(Math.max(newY, -maxPanY), maxPanY),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastTouchDistanceRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);

      // If at 1x zoom, detect horizontal swipe to change products
      if (scale === 1 && e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartPos.current.x;
        const deltaY = e.changedTouches[0].clientY - touchStartPos.current.y;
        if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 40) {
          if (deltaX < 0) {
            handleNext();
          } else {
            handlePrev();
          }
        }
      }
    }
  };

  if (!isOpen || !currentProduct) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    >
      {/* 1. TOP HEADER BAR */}
      <div className="relative z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent text-white">
        <div className="flex items-center gap-3 max-w-[70%]">
          <div className="bg-white/10 px-2.5 py-1 rounded-full text-xs font-mono text-neutral-300">
            {currentIndex + 1} / {products.length}
          </div>
          <div className="truncate">
            <h3 className="text-sm md:text-base font-bold text-white truncate">
              {currentProduct.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              {currentProduct.category && <span>{currentProduct.category}</span>}
              {currentProduct.attributes?.sku && (
                <>
                  <span>•</span>
                  <span className="font-mono text-[11px]">SKU: {currentProduct.attributes.sku}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Fullscreen toggle button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition hidden sm:flex"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition hover:scale-105 active:scale-95"
            title="Cerrar visor (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN IMAGE VIEWPORT */}
      <div
        className={`flex-1 relative flex items-center justify-center overflow-hidden p-2 md:p-6 ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onDoubleClick={(e) => handleDoubleTap(e.clientX, e.clientY)}
      >
        {/* Navigation arrows (desktop & tablets) */}
        {products.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-3 md:left-6 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 shadow-xl transition hover:scale-110 active:scale-95 backdrop-blur-xs"
              title="Producto anterior (Flecha izquierda)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-3 md:right-6 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 shadow-xl transition hover:scale-110 active:scale-95 backdrop-blur-xs"
              title="Producto siguiente (Flecha derecha)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Loading Spinner */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Active Product Image */}
        <img
          ref={imgRef}
          src={currentProduct.imageUrl}
          alt={currentProduct.name}
          referrerPolicy="no-referrer"
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('/api/proxy-image') && currentProduct.imageUrl.startsWith('http')) {
              target.src = `/api/proxy-image?url=${encodeURIComponent(currentProduct.imageUrl)}`;
            } else {
              setImageError(true);
            }
          }}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
            transformOrigin: 'center center',
          }}
          className={`max-w-full max-h-[75vh] md:max-h-[82vh] object-contain select-none shadow-2xl rounded-sm will-change-transform ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          draggable={false}
        />

        {/* Fallback if image failed completely */}
        {imageError && (
          <div className="text-center text-neutral-400 p-6 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-sm font-semibold">No se pudo cargar la imagen ampliada</p>
            <p className="text-xs text-neutral-500 mt-1">El servidor de origen no responde</p>
          </div>
        )}
      </div>

      {/* 3. BOTTOM CONTROL BAR & PRODUCT QUICK INFO */}
      <div className="relative z-10 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
        {/* Price & availability badge */}
        <div className="flex items-center gap-3">
          <span className="text-lg md:text-xl font-bold font-mono text-emerald-400">
            ${currentProduct.price.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
          </span>
          {currentProduct.attributes?.availability && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                currentProduct.attributes.availability === 'Agotado'
                  ? 'bg-red-500/80 text-white'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {currentProduct.attributes.availability}
            </span>
          )}
        </div>

        {/* FLOATING ZOOM CONTROLS PILL */}
        <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-white/15 px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="p-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition"
            title="Reducir zoom (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom % Indicator (Clicking resets to 100%) */}
          <button
            onClick={handleResetZoom}
            className="text-xs font-mono font-bold px-2 py-1 rounded text-neutral-200 hover:text-white hover:bg-white/10 transition"
            title="Restablecer zoom a 100%"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className="p-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition"
            title="Aumentar zoom (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-white/20 mx-1" />

          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition"
            title="Restablecer vista"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Pan and interaction hint */}
        <div className="text-[11px] text-neutral-400 hidden lg:flex items-center gap-2">
          {scale > 1 ? (
            <span className="flex items-center gap-1 text-blue-300">
              <Move className="w-3.5 h-3.5 animate-pulse" />
              Arrastra para desplazar la imagen
            </span>
          ) : (
            <span>Doble clic o pellizca para ampliar • Rueda del ratón para zoom</span>
          )}
        </div>
      </div>
    </div>
  );
}
