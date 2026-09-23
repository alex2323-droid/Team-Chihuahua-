import { jsPDF } from 'jspdf';
import { BusinessInfo, CatalogSettings, Product } from '../types';

export interface PdfExportOptions {
  includePrices?: boolean;
  includeContact?: boolean;
  includeSku?: boolean;
  includeAttributes?: boolean;
  layoutStyle?: 'grid' | 'detailed';
  onProgress?: (progressText: string) => void;
}

/**
 * Creates an attractive fallback JPEG placeholder on an offscreen canvas
 * with the product initial and subtitle so that no card ever has a blank white box.
 */
function createFallbackPlaceholder(name: string): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Clean background
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, 300, 300);

    // Frame border
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 288, 288);

    // Center circular badge
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(150, 125, 55, 0, Math.PI * 2);
    ctx.fill();

    // Initial letter
    const initial = (name || 'P').trim().charAt(0).toUpperCase();
    ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, 150, 128);

    // Label
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('Producto', 150, 215);

    return canvas.toDataURL('image/jpeg', 0.90);
  } catch {
    return '';
  }
}

/**
 * Loads an image (URL or Base64) and renders it onto an HTML5 Canvas,
 * then exports it strictly as a standard Baseline JPEG DataURL.
 * This guarantees:
 * 1. Standard JFIF JPEG bitstream compatible with all mobile/desktop PDF viewers (WPS Office, Acrobat, Drive, etc.).
 * 2. Complete avoidance of AVIF / WebP / corrupt stream errors in jsPDF /DCTDecode.
 * 3. White background backing for PNG transparency.
 * 4. Automatic reuse of already-rendered DOM images from the active preview.
 */
async function loadAndConvertImageToJpeg(
  sourceUrl: string,
  productName: string
): Promise<string | null> {
  if (!sourceUrl) return createFallbackPlaceholder(productName);

  // Helper to render any HTMLImageElement to standard JPEG DataURL via canvas
  const renderImageToJpeg = (img: HTMLImageElement): string | null => {
    try {
      const canvas = document.createElement('canvas');
      const maxDim = 500;
      let w = img.naturalWidth || img.width || 400;
      let h = img.naturalHeight || img.height || 400;

      if (w > maxDim || h > maxDim) {
        if (w >= h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = Math.max(w, 80);
      canvas.height = Math.max(h, 80);

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Solid white background (prevents black background on transparent PNGs)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Export as pure standard Baseline JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      return dataUrl.startsWith('data:image/jpeg') ? dataUrl : null;
    } catch (e) {
      console.warn('[PDF Export] Canvas draw failed:', e);
      return null;
    }
  };

  // FAST PATH: Check if an <img> tag with this image is already loaded in the browser DOM!
  // The catalog preview on the screen already loaded and decoded the image.
  try {
    const existingImgs = Array.from(document.querySelectorAll('img'));
    for (const domImg of existingImgs) {
      if (
        domImg.complete &&
        domImg.naturalWidth > 10 &&
        (domImg.src === sourceUrl ||
         (sourceUrl.startsWith('http') && domImg.src.includes(encodeURIComponent(sourceUrl))) ||
         (sourceUrl.length > 25 && domImg.src.includes(sourceUrl.slice(-25))))
      ) {
        const jpeg = renderImageToJpeg(domImg);
        if (jpeg) return jpeg;
      }
    }
  } catch (domErr) {
    console.debug('[PDF Export] DOM img search:', domErr);
  }

  // SECOND PATH: Load image via Image object using the proxy URL to bypass CORS
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let isDone = false;
    const finish = (result: string | null) => {
      if (!isDone) {
        isDone = true;
        resolve(result || createFallbackPlaceholder(productName));
      }
    };

    const timer = setTimeout(() => {
      finish(null);
    }, 4500);

    img.onload = () => {
      clearTimeout(timer);
      const jpeg = renderImageToJpeg(img);
      finish(jpeg);
    };

    img.onerror = () => {
      clearTimeout(timer);
      // Try direct URL if proxy had an issue
      if (sourceUrl.startsWith('http') && img.src !== sourceUrl) {
        const directImg = new Image();
        directImg.crossOrigin = 'anonymous';
        directImg.onload = () => finish(renderImageToJpeg(directImg));
        directImg.onerror = () => finish(null);
        directImg.src = sourceUrl;
      } else {
        finish(null);
      }
    };

    // For HTTP/HTTPS URLs, route through proxy to prevent CORS blocking
    if (sourceUrl.startsWith('http')) {
      img.src = `/api/proxy-image?url=${encodeURIComponent(sourceUrl)}`;
    } else {
      img.src = sourceUrl;
    }
  });
}

// Convert Hex string to RGB numbers
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = (hex || '#111827').replace('#', '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 17, g: 24, b: 39 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Format price with currency symbol
function formatPrice(amount: number, currency: string): string {
  switch (currency) {
    case 'EUR':
      return `€${amount.toFixed(2)}`;
    case 'USD':
      return `$${amount.toFixed(2)} USD`;
    case 'COP':
      return `$${amount.toLocaleString('es-CO')} COP`;
    case 'MXN':
      return `$${amount.toLocaleString('es-MX')} MXN`;
    case 'ARS':
      return `$${amount.toLocaleString('es-AR')} ARS`;
    case 'CLP':
      return `$${amount.toLocaleString('es-CL')} CLP`;
    case 'PEN':
      return `S/ ${amount.toFixed(2)}`;
    default:
      return `${amount.toFixed(2)} ${currency}`;
  }
}

export async function generateCatalogPdf(
  business: BusinessInfo,
  settings: CatalogSettings,
  products: Product[],
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    includePrices = true,
    includeContact = true,
    includeSku = settings.showSku,
    includeAttributes = settings.showAttributes,
    layoutStyle = 'grid',
    onProgress,
  } = options;

  onProgress?.('Preparando documento PDF...');

  // Standard A4: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const primaryRgb = hexToRgb(settings.primaryColor || '#111827');
  const accentRgb = hexToRgb(settings.secondaryColor || '#3B82F6');

  // Pre-load and convert all product images to pure standard Baseline JPEG
  onProgress?.('Cargando y optimizando fotografías...');
  const loadedImages: { [productId: string]: string | null } = {};

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    onProgress?.(`Procesando fotografía (${i + 1}/${products.length})...`);
    loadedImages[p.id] = await loadAndConvertImageToJpeg(p.imageUrl, p.name);
  }

  onProgress?.('Diseñando páginas del catálogo...');

  let currentPage = 1;

  // Helper to add the header on a page
  const drawPageHeader = (isFirstPage: boolean) => {
    // Top colored brand bar
    doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.rect(0, 0, pageWidth, 5, 'F');

    if (isFirstPage) {
      // Large stylish business header
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, 10, contentWidth, 34, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, 10, contentWidth, 34, 3, 3, 'S');

      // Brand accent line
      doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
      doc.rect(margin, 10, 4, 34, 'F');

      // Business Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text(business.name || 'Catálogo de Productos', margin + 8, 20);

      // Subtitle / Catalog label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const dateStr = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc.text(`Catálogo Oficial de Productos • Actualizado: ${dateStr}`, margin + 8, 26);

      // Contact details
      if (includeContact) {
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const contactParts = [];
        if (business.whatsapp) contactParts.push(`WhatsApp: +${business.whatsapp}`);
        if (business.phone) contactParts.push(`Tel: ${business.phone}`);
        if (business.email) contactParts.push(`Email: ${business.email}`);
        if (business.address) contactParts.push(`Dir: ${business.address}`);
        if (business.instagram) contactParts.push(`Instagram: @${business.instagram}`);
        
        const contactLine = contactParts.join('  •  ');
        if (contactLine) {
          doc.text(contactLine, margin + 8, 32);
        }

        if (business.additionalInfo) {
          const infoCut = business.additionalInfo.length > 90
            ? business.additionalInfo.substring(0, 87) + '...'
            : business.additionalInfo;
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(infoCut, margin + 8, 38);
        }
      }

      return 50; // Starting Y coordinate for products on page 1
    } else {
      // Compact top header for subsequent pages
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.text(business.name || 'Catálogo de Productos', margin, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Catálogo Oficial', pageWidth - margin, 12, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, 15, pageWidth - margin, 15);

      return 22; // Starting Y coordinate for subsequent pages
    }
  };

  // Helper to add footer on a page
  const drawPageFooter = (pageNum: number) => {
    const footerY = pageHeight - 9;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    if (includeContact && business.whatsapp) {
      doc.text(`Pedidos e Información directa por WhatsApp: +${business.whatsapp}`, margin, footerY);
    } else {
      doc.text(`Catálogo digital para pedidos y consultas`, margin, footerY);
    }

    doc.text(`Página ${pageNum}`, pageWidth - margin, footerY, { align: 'right' });
  };

  // ==========================================
  // RENDER PRODUCTS
  // ==========================================

  let currentY = drawPageHeader(true);

  if (layoutStyle === 'grid') {
    // 2 COLUMNS GRID LAYOUT (Clean, high-density, catalog card format)
    const cardWidth = (contentWidth - 6) / 2;
    const cardHeight = 72; // Card height in mm
    let colIndex = 0;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];

      // Check if we need a new page
      if (currentY + cardHeight > pageHeight - 16) {
        drawPageFooter(currentPage);
        doc.addPage();
        currentPage++;
        currentY = drawPageHeader(false);
        colIndex = 0;
      }

      const cardX = margin + colIndex * (cardWidth + 6);
      const cardY = currentY;

      // Draw Card Container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

      // Product Image (Square photo)
      const imgSize = 28;
      const imgX = cardX + 3;
      const imgY = cardY + 4;
      const base64Img = loadedImages[p.id];

      if (base64Img) {
        try {
          doc.addImage(base64Img, 'JPEG', imgX, imgY, imgSize, imgSize, undefined, 'FAST');
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.roundedRect(imgX, imgY, imgSize, imgSize, 1, 1, 'S');
        } catch (imgErr) {
          console.warn('[PDF Export] addImage failed:', imgErr);
        }
      }

      // Details beside the image
      const textX = imgX + imgSize + 3;
      const textWidth = cardWidth - (imgSize + 9);

      // SKU Badge (if enabled)
      let metaY = cardY + 7;
      if (includeSku && p.attributes?.sku) {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(textX, metaY - 3, 20, 4.5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(p.attributes.sku, textX + 1.5, metaY);
        metaY += 6;
      }

      // Product Name (bold, clean)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const titleLines = doc.splitTextToSize(p.name, textWidth);
      doc.text(titleLines.slice(0, 2), textX, metaY);

      // Price Tag (Prominent, colored)
      if (includePrices) {
        const priceY = metaY + (titleLines.length > 1 ? 9 : 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        doc.text(formatPrice(p.price, settings.currency), textX, priceY);
      }

      // Description (wrapped below image)
      const descY = cardY + imgSize + 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(100, 116, 139);
      const desc = p.description || 'Producto disponible para pedido inmediato.';
      const descLines = doc.splitTextToSize(desc, cardWidth - 6);
      doc.text(descLines.slice(0, 2), cardX + 3, descY);

      // Attributes Footer (Colors, sizes, brand)
      if (includeAttributes && p.attributes) {
        const attrY = cardY + cardHeight - 5;
        const attrItems = [];
        if (p.attributes.brand && p.attributes.brand !== 'Importado') {
          attrItems.push(`Marca: ${p.attributes.brand}`);
        }
        if (p.attributes.sizes && p.attributes.sizes.length > 0) {
          attrItems.push(`Tallas: ${p.attributes.sizes.slice(0, 3).join(', ')}`);
        }
        if (p.attributes.colors && p.attributes.colors.length > 0) {
          attrItems.push(`Colores: ${p.attributes.colors.slice(0, 2).join(', ')}`);
        }
        
        if (attrItems.length > 0) {
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          const attrStr = attrItems.join(' • ');
          doc.text(attrStr.substring(0, 48), cardX + 3, attrY);
        }
      }

      // Column and Row Advancement
      if (colIndex === 0) {
        colIndex = 1;
      } else {
        colIndex = 0;
        currentY += cardHeight + 4;
      }
    }
  } else {
    // DETAILED LIST LAYOUT (Wide horizontal cards with extensive description)
    const itemHeight = 38;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];

      if (currentY + itemHeight > pageHeight - 16) {
        drawPageFooter(currentPage);
        doc.addPage();
        currentPage++;
        currentY = drawPageHeader(false);
      }

      const itemY = currentY;

      // Card Background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, itemY, contentWidth, itemHeight, 2, 2, 'FD');

      // Product Image
      const imgSize = 32;
      const imgX = margin + 3;
      const imgY = itemY + 3;
      const base64Img = loadedImages[p.id];

      if (base64Img) {
        try {
          doc.addImage(base64Img, 'JPEG', imgX, imgY, imgSize, imgSize, undefined, 'FAST');
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.roundedRect(imgX, imgY, imgSize, imgSize, 1, 1, 'S');
        } catch (imgErr) {
          console.warn('[PDF Export] addImage failed in detailed layout:', imgErr);
        }
      }

      // Info Block
      const infoX = imgX + imgSize + 4;
      const infoWidth = contentWidth - (imgSize + 10);

      // Name & SKU
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(p.name, infoX, itemY + 8);

      // Price right-aligned or prominent
      if (includePrices) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        doc.text(formatPrice(p.price, settings.currency), margin + contentWidth - 4, itemY + 8, {
          align: 'right',
        });
      }

      // SKU and category
      let subY = itemY + 13;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const metaElements = [];
      if (includeSku && p.attributes?.sku) metaElements.push(`SKU: ${p.attributes.sku}`);
      if (p.category) metaElements.push(`Categoría: ${p.category}`);
      if (p.attributes?.brand && p.attributes.brand !== 'Importado') metaElements.push(`Marca: ${p.attributes.brand}`);
      if (metaElements.length > 0) {
        doc.text(metaElements.join('  |  '), infoX, subY);
        subY += 5;
      }

      // Description
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const desc = p.description || 'Producto seleccionado para venta directa.';
      const descLines = doc.splitTextToSize(desc, infoWidth - 25);
      doc.text(descLines.slice(0, 2), infoX, subY);

      // Attributes tag line
      if (includeAttributes && p.attributes) {
        const details = [];
        if (p.attributes.sizes && p.attributes.sizes.length > 0) {
          details.push(`Tallas: ${p.attributes.sizes.join(', ')}`);
        }
        if (p.attributes.colors && p.attributes.colors.length > 0) {
          details.push(`Colores: ${p.attributes.colors.join(', ')}`);
        }
        if (details.length > 0) {
          doc.setFontSize(6.8);
          doc.setTextColor(148, 163, 184);
          doc.text(details.join('  •  '), infoX, itemY + itemHeight - 3);
        }
      }

      currentY += itemHeight + 3.5;
    }
  }

  // Final page footer
  drawPageFooter(currentPage);

  onProgress?.('¡Descargando archivo PDF...');

  // Save the PDF file
  const cleanName = (business.name || 'Catalogo')
    .replace(/[^a-zA-Z0-9_\u00C0-\u017F\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  
  doc.save(`Catalogo_${cleanName}.pdf`);
}
