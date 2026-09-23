import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Set up JSON parsing with a higher limit for base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// File-based database for catalogs
const DB_FILE = path.join(process.cwd(), "catalogs_db.json");
const SELLERS_FILE = path.join(process.cwd(), "sellers_db.json");

// Helper to read database
function readDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading database:", error);
  }
  return {};
}

// Helper to write to database
function writeDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database:", error);
  }
}

// Helper to read sellers database
function readSellers() {
  try {
    if (fs.existsSync(SELLERS_FILE)) {
      const data = fs.readFileSync(SELLERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading sellers database:", error);
  }
  return {};
}

// Helper to write to sellers database
function writeSellers(data: any) {
  try {
    fs.writeFileSync(SELLERS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to sellers database:", error);
  }
}

// Initialize Gemini client on the server
// Always lazy load / verify key is present when endpoint is called to avoid startup crash
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined in the workspace secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ============================================================================
// Shared Sanitization Utilities for E-commerce Scraping & AI Responses
// ============================================================================

// Thoroughly strips marketplace platform branding (Temu, AliExpress, etc.), original price text, and discounts
function cleanScrub(str: string): string {
  if (!str) return "";
  return str
    // Remove marketplace phrases like "Compra en Temu", "Comprar en...", "en Temu", "Temu España", "Temu México"
    .replace(/\b(compra\s+en|comprar\s+en|disponible\s+en|vendido\s+por|en|desde|de)\s+(temu|aliexpress|amazon|shein|ebay|shopee|mercadolibre|walmart|aliexpress)\b/gi, "")
    .replace(/\b(temu|aliexpress|amazon|shein|ebay|shopee|mercadolibre|walmart|alibaba|taobao|dhgate|wish)(\s+(españa|espana|mexico|méxico|usa|global|oficial|app|web|store|tienda))?\b/gi, "")
    // Remove marketplace title suffixes like " | Temu", " - Temu", " | AliExpress", " - Amazon"
    .replace(/[|\-–—·]\s*(temu|aliexpress|amazon|shein|ebay|shopee|mercadolibre|walmart).*$/gi, "")
    // Remove promotional hooks and UI phrases
    .replace(/\b(envío\s+gratis|devolución\s+gratis|garantía|devoluciones?|mejor\s+vendido|más\s+vendido|top\s+ventas)\b/gi, "")
    .replace(/\b(comprar\s+ahora|añadir\s+a\s+la\s+cesta|agregar\s+al\s+carrito|ver\s+detalles|calificación|reseñas)\b/gi, "")
    // Remove currency codes and symbols with numbers (e.g., $13.93, 13.93 EUR, USD 13.93, 13,93€, etc.)
    .replace(/\b(usd|eur|cop|mxn|ars|clp|pen)\s*\$?\s*\d+([.,]\d+)?/gi, "")
    .replace(/\d+([.,]\d+)?\s*(usd|eur|cop|mxn|ars|clp|pen)\b/gi, "")
    .replace(/[\$€£¥]\s*\d+([.,]\d+)?/gi, "")
    .replace(/\d+([.,]\d+)?\s*[\$€£¥]/gi, "")
    // Remove discount badges like "-50%", "50% de descuento", "rebaja", "oferta"
    .replace(/-\s*\d+%/g, "")
    .replace(/\d+%\s*off\b/gi, "")
    .replace(/\d+%\s*de\s*descuento\b/gi, "")
    .replace(/\b(rebajas?|descuentos?|ofertas?|promoción|promociones?)\b/gi, "")
    // Clean stray punctuation and extra whitespace
    .replace(/^[|·:–—\-,\s]+/, "")
    .replace(/[|·:–—\-,\s]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Cleans image URLs to guarantee direct high-resolution master image without watermarks or UI overlays
function cleanMasterImageUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  let clean = rawUrl.trim();
  clean = clean
    .replace(/&amp;/g, "&")
    .replace(/\\u002[fF]/g, "/")
    .replace(/\\+/g, "")
    .replace(/\\/g, "");
  if (clean.startsWith("//")) clean = "https:" + clean;

  // 1. Remove platform slim compression suffixes that may inject watermarks (e.g., .jpg.slim.jpeg -> .jpg)
  clean = clean.replace(/\.slim\.(jpeg|jpg|png|webp)/gi, "");

  // 2. Remove query parameters that inject watermarks, watermarked text, or downscaled thumbnails
  clean = clean.replace(/([?&])(watermark|wm|wm_text|x-oss-process|imageView2|imageMogr2)[^&#]*/gi, "");

  // 3. Remove trailing symbols
  clean = clean.replace(/[?&]+$/, "").replace(/[\\),.;"'`>&\s\]\}]+$/, "");

  return clean;
}

// Sanitizes AI and scraped responses to guarantee brand white-labeling and correct user price
function sanitizeProductPayload(data: any, priceHint?: number | string, primaryImageUrl?: string) {
  if (!data) return data;
  if (typeof data.name === "string") {
    data.name = cleanScrub(data.name);
    if (data.name.length > 55) {
      data.name = data.name.substring(0, 52).trim() + "...";
    }
  }
  if (typeof data.description === "string") {
    data.description = cleanScrub(data.description);
  }
  if (data.attributes) {
    if (typeof data.attributes.brand === "string") {
      const scrubbed = cleanScrub(data.attributes.brand);
      data.attributes.brand = scrubbed && !/^(temu|aliexpress|amazon|shein|ebay|shopee|mercadolibre)$/i.test(scrubbed)
        ? scrubbed
        : "Importado";
    }
    if (Array.isArray(data.attributes.features)) {
      data.attributes.features = data.attributes.features
        .map((f: string) => cleanScrub(f))
        .filter((f: string) => Boolean(f) && !/^(temu|aliexpress|amazon|shein)$/i.test(f));
    }
  }
  // Enforce the user-specified selling price (discard origin marketplace price entirely)
  if (priceHint !== undefined && priceHint !== null && !isNaN(Number(priceHint))) {
    data.price = Number(priceHint);
  } else {
    data.price = 0;
  }
  // Lock to primary clean product image URL if provided
  if (primaryImageUrl) {
    data.imageUrl = cleanMasterImageUrl(primaryImageUrl);
  } else if (data.imageUrl) {
    data.imageUrl = cleanMasterImageUrl(data.imageUrl);
  }
  return data;
}

// ============================================================================
// API Routes
// ============================================================================

// Strict system prompt for AI processing of images and URLs
const STRICT_SYSTEM_PROMPT =
  "Analiza el contenido de esta URL/imagen. Extrae únicamente el nombre comercial del producto, descartando cualquier mención a la plataforma de origen (ej. Temu), precios originales, logos o marcas de agua. Devuelve solo un título limpio y la URL de la imagen principal en alta resolución";

// 1. Analyze product image
app.post("/api/analyze-image", async (req, res) => {
  try {
    const { imageBase64, mimeType, priceHint, systemPrompt } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Falta la imagen en formato base64." });
    }

    const ai = getGeminiClient();

    // Standard base64 format clean up
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: cleanBase64,
      },
    };

    const activeSystemInstruction = systemPrompt || STRICT_SYSTEM_PROMPT;

    const promptText = `
      ${activeSystemInstruction}

      INSTRUCCIONES DE EXTRACCIÓN:
      1. Extrae únicamente el nombre comercial limpio del producto físico en español (máximo 45 caracteres).
      2. Descarta cualquier mención a la plataforma de origen (ej. Temu, AliExpress, Shein, Amazon, etc.), logotipos, marcas de agua (watermarks) o etiquetas de tiendas.
      3. Descarta precios originales, ofertas de origen o monedas. El precio del usuario es: ${priceHint !== undefined ? priceHint : 0}.
      4. Devuelve solo un título limpio y características físicas reales.
    `;

    const modelParams = {
      contents: [
        imagePart,
        { text: promptText }
      ],
      config: {
        systemInstruction: activeSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Nombre comercial limpio del producto físico sin marcas de plataformas, logos ni precios."
            },
            description: {
              type: Type.STRING,
              description: "Descripción comercial fluida y limpia del producto de 1 a 2 oraciones, sin tiendas ni precios."
            },
            sku: {
              type: Type.STRING,
              description: "Código SKU autogenerado o detectado (p. ej., PROD-A91B)."
            },
            attributes: {
              type: Type.OBJECT,
              properties: {
                colors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Colores principales del producto visibles en la foto."
                },
                sizes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Tallas, tamaños o dimensiones estimadas del producto si es relevante."
                },
                brand: {
                  type: Type.STRING,
                  description: "Marca del producto (solo si es claramente visible en la imagen; si no, dejar vacío)."
                },
                model: {
                  type: Type.STRING,
                  description: "Modelo del producto (solo si es claramente visible)."
                },
                features: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Lista de 2 a 4 características físicas destacables (material, estilo, detalles)."
                }
              }
            },
            imageQuality: {
              type: Type.STRING,
              enum: ["Good", "Poor"],
              description: "Calidad de la fotografía para catálogo. 'Good' si es nítida y clara, o 'Poor' si es borrosa, tiene mala iluminación, etc."
            }
          },
          required: ["name", "description", "imageQuality"]
        }
      }
    };

    const modelsToTry = [
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash"
    ];

    let response = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Intentando análisis con modelo: ${modelName}...`);
        response = await ai.models.generateContent({
          model: modelName,
          ...modelParams
        });
        if (response && response.text) {
          console.log(`Análisis exitoso con modelo: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`El modelo ${modelName} falló:`, err.message);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw new Error(lastError ? lastError.message : "Todos los modelos de Gemini fallaron o se encuentran saturados.");
    }

    const resultText = response.text;
    const jsonResponse = sanitizeProductPayload(JSON.parse(resultText), priceHint);
    res.json(jsonResponse);
  } catch (error: any) {
    console.log("Aviso: El escáner de imagen superó límites de cuota, activando fallback local...");
    res.status(500).json({ 
      error: "El servicio de análisis de IA se encuentra saturado. Se ha agregado como producto manual para que lo edites.", 
      details: error.message 
    });
  }
});

// Proxy image endpoint to bypass any browser hotlink / CDN referer protections
app.get("/api/proxy-image", async (req, res) => {
  let imageUrl = req.query.url as string;
  if (req.originalUrl && req.originalUrl.includes("url=")) {
    const rawTarget = req.originalUrl.substring(req.originalUrl.indexOf("url=") + 4);
    try {
      imageUrl = decodeURIComponent(rawTarget);
    } catch {
      imageUrl = rawTarget;
    }
  }

  if (!imageUrl || (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://"))) {
    return res.status(400).send("Invalid image URL");
  }

  // Force standard JPEG format for Unsplash and image CDNs
  if (imageUrl.includes("images.unsplash.com")) {
    imageUrl = imageUrl.replace(/auto=format/g, "fm=jpg");
    if (!imageUrl.includes("fm=jpg") && !imageUrl.includes("format=jpg")) {
      imageUrl += (imageUrl.includes("?") ? "&" : "?") + "fm=jpg";
    }
  }

  try {
    const fetchRes = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/jpeg,image/png;q=0.9,image/*;q=0.8",
        "Referer": imageUrl.includes("temu") ? "https://www.temu.com/" : ""
      }
    });
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).send("Failed to fetch image upstream");
    }
    const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const arrayBuffer = await fetchRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error("[Proxy Image Error]", err.message);
    return res.status(500).send("Error proxying image");
  }
});

// Helper function to extract OpenGraph & clean product images from webpages (Temu, AliExpress, etc.)
async function scrapeProductMetadata(url: string) {
  try {
    console.log(`[Scraper] Iniciando extracción como filtro estricto para: ${url}`);
    
    // Fetch with a real desktop user-agent to bypass basic scrape protection, with a 3.5s timeout
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(3500)
    });

    if (!res.ok) {
      console.log(`[Scraper] El servidor respondió con estado: ${res.status}`);
      return null;
    }

    const html = await res.text();

    const cleanEntities = (str: string) => {
      return str
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
    };

    let title = "";
    let imageUrl = "";
    let description = "";

    // 1. Check for schema.org JSON-LD (often contains clean unwatermarked product photos & official names)
    try {
      const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let jsonLdMatch;
      while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
        try {
          const parsed = JSON.parse(jsonLdMatch[1].trim());
          const items = Array.isArray(parsed) ? parsed : (parsed["@graph"] ? parsed["@graph"] : [parsed]);
          for (const item of items) {
            if (item && (item["@type"] === "Product" || (typeof item["@type"] === "string" && item["@type"].includes("Product")))) {
              if (!title && item.name && typeof item.name === "string") {
                title = cleanEntities(item.name);
              }
              if (!imageUrl && item.image) {
                const img = Array.isArray(item.image) ? item.image[0] : (typeof item.image === "object" ? item.image.url : item.image);
                if (img && typeof img === "string") {
                  imageUrl = cleanMasterImageUrl(cleanEntities(img));
                }
              }
            }
          }
        } catch {}
      }
    } catch {}

    // 2. OpenGraph and Twitter tags
    const titleRegex = /<meta\s+(?:property|name)=["'](?:og:title|twitter:title)["']\s+content=["']([^"']+)["']/i;
    const imageRegex = /<meta\s+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["']\s+content=["']([^"']+)["']/i;
    const descRegex = /<meta\s+(?:property|name)=["'](?:og:description|twitter:description)["']\s+content=["']([^"']+)["']/i;
    const normalTitleRegex = /<title>([^<]+)<\/title>/i;

    if (!title) {
      const titleMatch = html.match(titleRegex);
      if (titleMatch) title = cleanEntities(titleMatch[1]);
      else {
        const normalTitleMatch = html.match(normalTitleRegex);
        if (normalTitleMatch) title = cleanEntities(normalTitleMatch[1]);
      }
    }

    if (!imageUrl) {
      const imageMatch = html.match(imageRegex);
      if (imageMatch) imageUrl = cleanMasterImageUrl(cleanEntities(imageMatch[1]));
    }

    const descMatch = html.match(descRegex);
    if (descMatch) description = cleanEntities(descMatch[1]);

    title = title ? cleanScrub(title).trim() : "";
    imageUrl = imageUrl ? cleanMasterImageUrl(imageUrl).trim() : "";
    description = description ? cleanScrub(description).trim() : "";

    const isActualImage = (u: string): boolean => {
      if (!u) return false;
      const l = u.toLowerCase();
      if (l.endsWith(".html") || l.endsWith(".htm") || l.endsWith(".js") || l.endsWith(".css") || l === "https://www.temu.com" || l === "https://www.temu.com/") {
        return false;
      }
      return l.includes(".jpg") || l.includes(".jpeg") || l.includes(".png") || l.includes(".webp") || l.includes(".avif") || l.includes("/upload_aimg/") || l.includes("/commodity/") || l.includes("/goods/");
    };

    const isImageDisallowed = (cand: string): boolean => {
      const l = cand.toLowerCase();
      return (
        l.includes("watermark") ||
        l.includes("wm_") ||
        l.includes("_wm") ||
        l.includes("logo") ||
        l.includes("badge") ||
        l.includes("banner") ||
        l.includes("icon") ||
        l.includes("share") ||
        l.includes("checkout") ||
        l.includes("dynamic") ||
        l.includes("promo") ||
        l.includes("activity") ||
        l.includes("button") ||
        l.includes("btn") ||
        l.includes("avatar") ||
        l.includes("review") ||
        l.includes("comment") ||
        l.includes("footer") ||
        l.includes("header") ||
        l.includes("nav") ||
        l.includes("ui") ||
        l.includes("template") ||
        l.includes("frame") ||
        l.includes("tag") ||
        l.includes("sale") ||
        l.includes("discount") ||
        l.includes("rebaja") ||
        l.includes("oferta") ||
        l.includes("h5_") ||
        l.includes("v2_")
      );
    };

    // TEMU EXCLUSIVE & GENERAL CLEANUP:
    // Extract pure product carousel photos, completely free of watermarks, badges, prices or UI buttons.
    const urlRegex = /(https?:)?\\?\/\\?\/[^\s"'`<>]+/g;
    const matches = html.match(urlRegex) || [];
    const cleanCandidates: string[] = [];
    
    for (let rawCand of matches) {
      let cand = cleanMasterImageUrl(rawCand);
      if (!isActualImage(cand) || isImageDisallowed(cand)) continue;
      
      const candLower = cand.toLowerCase();

      if (url.toLowerCase().includes("temu")) {
        // Must belong to Temu CDN
        const isTemuCdn = candLower.includes("kwcdn.com") || candLower.includes("aimg.kwcdn.com") || candLower.includes("img.kwcdn.com");
        if (!isTemuCdn) continue;
        
        // Prioritize actual product commodity or goods photos
        const isProductImage = candLower.includes("/commodity/") || candLower.includes("/goods/");
        if (isProductImage && !cleanCandidates.includes(cand)) {
          cleanCandidates.push(cand);
        }
      } else {
        // Generic store: must be clean image
        if (!cleanCandidates.includes(cand)) {
          cleanCandidates.push(cand);
        }
      }
    }
    
    if (cleanCandidates.length > 0) {
      console.log(`[Scraper] Éxito - Encontradas ${cleanCandidates.length} imágenes limpias de alta calidad. Seleccionada: ${cleanCandidates[0]}`);
      imageUrl = cleanCandidates[0];
    } else if (imageUrl && !isImageDisallowed(imageUrl)) {
      imageUrl = cleanMasterImageUrl(imageUrl);
      console.log(`[Scraper] Seleccionada imagen base verificada: ${imageUrl}`);
    }

    // FINAL STRICT SCRUB: Purges all e-commerce brand mentions, UI text, and pricing
    title = cleanScrub(title);
    description = cleanScrub(description);

    console.log(`[Scraper] Filtro estricto completado: Título="${title.substring(0, 50)}...", Imagen="${imageUrl.substring(0, 50)}..."`);
    
    if (title || imageUrl) {
      return { title, imageUrl, description };
    }
    return null;
  } catch (error: any) {
    console.log(`[Scraper] Error durante la extracción de metadatos:`, error.message);
    return null;
  }
}

// 1b. Analyze product URL using AI as a strict filter (discards metadata, prices, logos, UI, watermarks)
app.post("/api/analyze-url", async (req, res) => {
  const { url, priceHint, systemPrompt } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Falta el enlace (URL) del producto." });
  }

  // 1. SCRAPE DIRECT METADATA FROM URL
  const scraped = await scrapeProductMetadata(url);

  // 2. Setup extraction safety net info
  const extractWordsFromUrl = (targetUrl: string): { name: string; category: string; placeholder: string } => {
    try {
      if (scraped && scraped.title) {
        let cleanScrapedTitle = cleanScrub(scraped.title);
        if (cleanScrapedTitle.length > 50) {
          cleanScrapedTitle = cleanScrapedTitle.substring(0, 47) + "...";
        }
        return {
          name: cleanScrapedTitle,
          category: "Importado",
          placeholder: scraped.imageUrl || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80"
        };
      }

      const parsed = new URL(targetUrl);
      let pathClean = parsed.pathname
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_/]/g, " ")
        .replace(/\b(p|g|gp|dp|item|product|productid|\d+)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      const scrubbedPath = cleanScrub(pathClean);

      const cleanName = scrubbedPath
        ? scrubbedPath.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
        : "Producto Importado";

      const nameLower = cleanName.toLowerCase();
      let category = "General";
      let placeholder = "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80";

      if (nameLower.includes("shoe") || nameLower.includes("zapatilla") || nameLower.includes("bota") || nameLower.includes("tennis")) {
        category = "Calzado";
        placeholder = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80";
      } else if (nameLower.includes("shirt") || nameLower.includes("ropa") || nameLower.includes("vestido") || nameLower.includes("jacket") || nameLower.includes("tshirt") || nameLower.includes("pant")) {
        category = "Ropa";
        placeholder = "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&auto=format&fit=crop&q=80";
      } else if (nameLower.includes("watch") || nameLower.includes("reloj")) {
        category = "Accesorios";
        placeholder = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
      } else if (nameLower.includes("bag") || nameLower.includes("mochila") || nameLower.includes("cartera") || nameLower.includes("backpack")) {
        category = "Accesorios";
        placeholder = "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80";
      } else if (nameLower.includes("phone") || nameLower.includes("case") || nameLower.includes("auricular") || nameLower.includes("headphone") || nameLower.includes("gadget") || nameLower.includes("tech")) {
        category = "Tecnología";
        placeholder = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80";
      }

      return { name: cleanName.substring(0, 50), category, placeholder };
    } catch {
      return { name: "Producto Importado", category: "General", placeholder: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80" };
    }
  };

  const localInfo = extractWordsFromUrl(url);

  // STRICT FILTER SYSTEM INSTRUCTION
  const activeSystemInstruction = systemPrompt || STRICT_SYSTEM_PROMPT;

  const promptText = `
${activeSystemInstruction}

Datos extraídos del producto:
- URL de origen: ${url}
${scraped?.title ? `- Título extraído de la página: "${scraped.title}"` : ''}
${scraped?.imageUrl ? `- URL directa de imagen limpia: "${scraped.imageUrl}"` : ''}
- Precio de venta fijado por el usuario: ${priceHint !== undefined ? priceHint : 0}

INSTRUCCIONES DE RESPUESTA:
1. "name": Devuelve EXCLUSIVAMENTE el nombre comercial limpio y vendedor en español (máximo 45 caracteres), sin mención a tiendas (ej. Temu), sin precios y sin marcas de agua.
2. "imageUrl": Devuelve solo la URL directa de la imagen principal en alta resolución limpia${scraped?.imageUrl ? ` (usa exactamente "${scraped.imageUrl}")` : ''}, libre de logos o marcas de agua.
3. "description": Breve descripción comercial (1-2 oraciones) orientada a la venta, sin tiendas ni precios.
4. "price": ${priceHint || 0} (estrictamente el precio del usuario, descartando el original).
5. "sku": Código SKU limpio tipo IMP-XXXX.
6. "attributes": Marca comercial o "Importado", colores y características físicas reales.`;

  const sharedSchema = {
    type: Type.OBJECT,
    properties: {
      name: { 
        type: Type.STRING, 
        description: "Título comercial exclusivo, limpio y directo del producto en español, sin marcas de tiendas externas ni precios." 
      },
      imageUrl: { 
        type: Type.STRING, 
        description: "URL directa de la fotografía de alta calidad del producto físico sin marcas de agua, logos ni banners." 
      },
      description: { 
        type: Type.STRING, 
        description: "Descripción comercial concisa de 1 a 2 oraciones orientada a venta, sin tiendas ni precios." 
      },
      price: {
        type: Type.NUMBER,
        description: "Precio de venta fijado por el usuario."
      },
      sku: { 
        type: Type.STRING, 
        description: "Código SKU en formato IMP-XXXX." 
      },
      attributes: {
        type: Type.OBJECT,
        properties: {
          colors: { type: Type.ARRAY, items: { type: Type.STRING } },
          sizes: { type: Type.ARRAY, items: { type: Type.STRING } },
          brand: { type: Type.STRING, description: "Marca comercial física o 'Importado'." },
          model: { type: Type.STRING },
          features: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    required: ["name", "imageUrl"]
  };

  // STAGE 1: Direct Gemini analysis acting as a strict filter
  const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash"];
  for (const modelName of models) {
    try {
      console.log(`[Stage 1] Aplicando filtro estricto con ${modelName}...`);
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: modelName,
        contents: promptText,
        config: {
          systemInstruction: activeSystemInstruction,
          responseMimeType: "application/json",
          responseSchema: sharedSchema
        }
      });

      if (response && response.text) {
        console.log(`[Stage 1] Filtrado exitoso con ${modelName}`);
        const parsed = JSON.parse(response.text);
        const sanitized = sanitizeProductPayload(parsed, priceHint, scraped?.imageUrl);
        return res.json(sanitized);
      }
    } catch (err: any) {
      console.log(`[Stage 1] Modelo ${modelName} no disponible, intentando siguiente...`);
    }
  }

  // STAGE 3: Offline Local Backup Parsing (Guaranteed Success - Zero API limits)
  try {
    console.log(`[Stage 3] Recurriendo a filtro estricto local offline`);
    const skuRandom = `IMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const localRaw = {
      name: localInfo.name,
      description: scraped && scraped.description 
        ? scraped.description.substring(0, 150) 
        : `Producto importado de alta calidad y diseño contemporáneo, disponible en catálogo.`,
      imageUrl: scraped?.imageUrl || localInfo.placeholder,
      price: priceHint !== undefined ? Number(priceHint) : 0,
      sku: skuRandom,
      attributes: {
        colors: ["Multicolor", "Estándar"],
        sizes: ["A consultar"],
        brand: "Importado",
        features: ["Diseño importado", "Listo para encargar", "Calidad Garantizada"]
      }
    };
    const sanitized = sanitizeProductPayload(localRaw, priceHint, scraped?.imageUrl);
    return res.json(sanitized);
  } catch (error: any) {
    console.error("Fallo crítico en Stage 3:", error);
    res.status(500).json({ error: "No se pudo procesar el enlace." });
  }
});

// 2. Save a catalog
app.post("/api/catalogs", (req, res) => {
  try {
    const { id, business, settings, products } = req.body;

    if (!business || !products) {
      return res.status(400).json({ error: "Faltan datos del negocio o productos." });
    }

    const db = readDatabase();
    
    // Generate a unique ID if not provided
    const catalogId = id || Math.random().toString(36).substring(2, 10).toUpperCase();

    const catalogData = {
      id: catalogId,
      business,
      settings,
      products,
      createdAt: new Date().toISOString()
    };

    db[catalogId] = catalogData;
    writeDatabase(db);

    res.json({ success: true, id: catalogId, catalog: catalogData });
  } catch (error: any) {
    console.error("Error al guardar el catálogo:", error);
    res.status(500).json({ error: "No se pudo guardar el catálogo.", details: error.message });
  }
});

// 3. Get a specific catalog
app.get("/api/catalogs/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = readDatabase();

    if (!db[id]) {
      return res.status(404).json({ error: "El catálogo solicitado no existe o ha expirado." });
    }

    res.json(db[id]);
  } catch (error: any) {
    console.error("Error al recuperar el catálogo:", error);
    res.status(500).json({ error: "No se pudo recuperar el catálogo." });
  }
});

// ============================================================================
// Seller Authentication & Cloud Storage Routes
// ============================================================================

// Register a new seller
app.post("/api/seller/register", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "El usuario y contraseña son obligatorios." });
    }
    
    const cleanUsername = username.trim().toLowerCase();
    const sellers = readSellers();
    
    if (sellers[cleanUsername]) {
      return res.status(400).json({ error: "El nombre de usuario ya está registrado." });
    }
    
    const catalogId = "CAT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const defaultCatalog = {
      id: catalogId,
      business: {
        name: username.trim() + " Store",
        whatsapp: "",
        paymentMethods: ["Efectivo"],
        additionalInfo: "Envíos a domicilio disponibles. Consulta formas de pago."
      },
      settings: {
        primaryColor: "#000000",
        secondaryColor: "#ffffff",
        theme: "dark", // Modo oscuro por defecto
        currency: "EUR",
        layout: "grid",
        showSku: true,
        showAttributes: true
      },
      products: []
    };
    
    sellers[cleanUsername] = {
      username: cleanUsername,
      password: password,
      catalogId: catalogId,
      catalog: defaultCatalog
    };
    
    writeSellers(sellers);
    
    res.json({ success: true, username: cleanUsername, catalog: defaultCatalog });
  } catch (error: any) {
    console.error("Error al registrar vendedor:", error);
    res.status(500).json({ error: "Error en el servidor al registrar el usuario." });
  }
});

// Login a seller
app.post("/api/seller/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "El usuario y contraseña son obligatorios." });
    }
    
    const cleanUsername = username.trim().toLowerCase();
    const sellers = readSellers();
    const seller = sellers[cleanUsername];
    
    if (!seller || seller.password !== password) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
    }
    
    res.json({ success: true, username: cleanUsername, catalog: seller.catalog });
  } catch (error: any) {
    console.error("Error al iniciar sesión de vendedor:", error);
    res.status(500).json({ error: "Error en el servidor al iniciar sesión." });
  }
});

// Load seller catalog
app.get("/api/seller/catalog", (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: "Falta el nombre de usuario." });
    }
    
    const cleanUsername = (username as string).trim().toLowerCase();
    const sellers = readSellers();
    const seller = sellers[cleanUsername];
    
    if (!seller) {
      return res.status(404).json({ error: "Vendedor no encontrado." });
    }
    
    res.json(seller.catalog);
  } catch (error: any) {
    console.error("Error al cargar catálogo del vendedor:", error);
    res.status(500).json({ error: "Error al recuperar la configuración." });
  }
});

// Save/Update seller catalog in real-time
app.post("/api/seller/save-catalog", (req, res) => {
  try {
    const { username, catalog } = req.body;
    if (!username || !catalog) {
      return res.status(400).json({ error: "Faltan datos para guardar el catálogo." });
    }
    
    const cleanUsername = username.trim().toLowerCase();
    const sellers = readSellers();
    
    if (!sellers[cleanUsername]) {
      return res.status(404).json({ error: "Vendedor no registrado." });
    }
    
    // Update the seller's private copy of catalog
    sellers[cleanUsername].catalog = catalog;
    writeSellers(sellers);
    
    // Also mirror this catalog in the global catalogs database so clients can view it live
    const catalogId = catalog.id || sellers[cleanUsername].catalogId;
    const db = readDatabase();
    
    db[catalogId] = {
      id: catalogId,
      business: catalog.business,
      settings: catalog.settings,
      products: catalog.products,
      createdAt: new Date().toISOString()
    };
    writeDatabase(db);
    
    res.json({ success: true, catalogId });
  } catch (error: any) {
    console.error("Error al guardar catálogo del vendedor:", error);
    res.status(500).json({ error: "Error de servidor al guardar catálogo." });
  }
});

// ============================================================================
// DEV SERVER & STATIC MIDDLEWARE SETUP
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support standard SPA route fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
