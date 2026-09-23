import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
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

// ----------------------------------------------------------------------------
// Seller Authentication & Password Hashing Utilities
// ----------------------------------------------------------------------------

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, s, 1000, 64, "sha512").toString("hex");
  return { hash, salt: s };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const check = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return check === hash;
  } catch {
    return false;
  }
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getSellerFromRequest(req: express.Request, db: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  const sessions = db["_sessions"] || {};
  const session = sessions[token];
  if (!session) return null;

  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    return null;
  }

  const sellers = db["_sellers"] || {};
  const seller = sellers[session.sellerId];
  if (!seller) return null;

  return { seller, token };
}

// Initialize default demo seller account if no sellers exist
function initializeDefaultSellerIfNeeded() {
  try {
    const db = readDatabase();
    if (!db["_sellers"]) {
      db["_sellers"] = {};
    }
    const sellers = Object.values(db["_sellers"]) as any[];
    if (sellers.length === 0) {
      const { hash, salt } = hashPassword("123456");
      const defaultSellerId = "seller-admin-01";
      db["_sellers"][defaultSellerId] = {
        id: defaultSellerId,
        username: "vendedor",
        email: "vendedor@catalogo.com",
        name: "Vendedor Principal",
        storeName: "Boutique Bella Vista",
        passwordHash: hash,
        salt: salt,
        createdAt: new Date().toISOString()
      };
      writeDatabase(db);
      console.log("[Auth] Creada cuenta inicial de vendedor demo: usuario='vendedor', clave='123456'");
    }
  } catch (err) {
    console.error("[Auth] Error al inicializar cuenta de vendedor:", err);
  }
}

initializeDefaultSellerIfNeeded();

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

// 2. Save a catalog (Public or Seller)
app.post("/api/catalogs", (req, res) => {
  try {
    const { id, business, settings, products } = req.body;

    if (!business || !products) {
      return res.status(400).json({ error: "Faltan datos del negocio o productos." });
    }

    const db = readDatabase();
    
    // Check if authenticated seller is saving
    const authData = getSellerFromRequest(req, db);
    const sellerId = authData?.seller?.id;

    // Generate a unique ID if not provided or use seller id
    const catalogId = id || (sellerId ? `cat-${sellerId.replace('seller-', '')}` : Math.random().toString(36).substring(2, 10).toUpperCase());

    const catalogData = {
      id: catalogId,
      sellerId: sellerId || null,
      business,
      settings,
      products,
      updatedAt: new Date().toISOString(),
      createdAt: db[catalogId]?.createdAt || new Date().toISOString()
    };

    db[catalogId] = catalogData;

    // Also persist under seller's private space if authenticated
    if (sellerId) {
      if (!db["_sellers_catalogs"]) db["_sellers_catalogs"] = {};
      db["_sellers_catalogs"][sellerId] = catalogData;
    }

    writeDatabase(db);

    res.json({ success: true, id: catalogId, catalog: catalogData });
  } catch (error: any) {
    console.error("Error al guardar el catálogo:", error);
    res.status(500).json({ error: "No se pudo guardar el catálogo.", details: error.message });
  }
});

// ============================================================================
// DEDICATED SELLER CATALOG ENDPOINTS (Carga y Guardado Automático por Vendedor)
// ============================================================================

// Obtener el catálogo y productos del vendedor autenticado
app.get("/api/seller/catalog", (req, res) => {
  try {
    const db = readDatabase();
    const authData = getSellerFromRequest(req, db);

    if (!authData) {
      return res.status(401).json({ error: "No autorizado. Inicia sesión como vendedor." });
    }

    const { seller } = authData;
    if (!db["_sellers_catalogs"]) db["_sellers_catalogs"] = {};

    let sellerCatalog = db["_sellers_catalogs"][seller.id];

    if (!sellerCatalog) {
      // Create initial catalog for new seller
      const catalogId = `cat-${seller.id.replace('seller-', '')}`;
      sellerCatalog = {
        id: catalogId,
        sellerId: seller.id,
        business: {
          name: seller.storeName || `Tienda ${seller.name}`,
          tagline: "Calidad garantizada y entregas directas",
          whatsapp: "",
          email: seller.email || "",
          address: "",
          instagram: "",
          facebook: "",
          website: "",
          announcement: "¡Bienvenidos a nuestro catálogo oficial! Haz tus pedidos fácilmente.",
          showAnnouncement: true,
          additionalInfo: ""
        },
        settings: {
          currency: "USD",
          theme: "light",
          darkMode: false,
          enableSearch: true,
          enableFilters: true,
          enableCart: true,
          itemsPerPage: 12,
          defaultSort: "featured",
          showPrices: true,
          showSKU: true,
          showStock: true,
          accentColor: "#000000"
        },
        products: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db["_sellers_catalogs"][seller.id] = sellerCatalog;
      db[catalogId] = sellerCatalog;
      writeDatabase(db);
    }

    return res.json({
      success: true,
      catalog: sellerCatalog,
    });
  } catch (error: any) {
    console.error("[Seller Catalog GET Error]:", error);
    return res.status(500).json({ error: "Error al recuperar el catálogo del vendedor." });
  }
});

// Guardar/Actualizar catálogo completo de productos del vendedor autenticado
app.post("/api/seller/catalog", (req, res) => {
  try {
    const db = readDatabase();
    const authData = getSellerFromRequest(req, db);

    if (!authData) {
      return res.status(401).json({ error: "No autorizado. Inicia sesión como vendedor." });
    }

    const { seller } = authData;
    const { business, settings, products, id } = req.body;

    if (!db["_sellers_catalogs"]) db["_sellers_catalogs"] = {};

    const existingCatalog = db["_sellers_catalogs"][seller.id] || {};
    const catalogId = id || existingCatalog.id || `cat-${seller.id.replace('seller-', '')}`;

    const updatedCatalog = {
      id: catalogId,
      sellerId: seller.id,
      business: business || existingCatalog.business || { name: seller.storeName || seller.name },
      settings: settings || existingCatalog.settings || {},
      products: Array.isArray(products) ? products : (existingCatalog.products || []),
      createdAt: existingCatalog.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db["_sellers_catalogs"][seller.id] = updatedCatalog;
    db[catalogId] = updatedCatalog; // Sync public catalog route too

    writeDatabase(db);

    console.log(`[Seller Catalog] Guardados ${updatedCatalog.products.length} productos en el catálogo de ${seller.username} (ID: ${catalogId})`);

    return res.json({
      success: true,
      message: "Catálogo de productos guardado exitosamente en tu cuenta.",
      catalogId,
      catalog: updatedCatalog,
    });
  } catch (error: any) {
    console.error("[Seller Catalog Save Error]:", error);
    return res.status(500).json({ error: "Error al guardar el catálogo en tu cuenta de vendedor." });
  }
});

// Agregar o actualizar un producto individual directamente en el catálogo del vendedor
app.post("/api/seller/products", (req, res) => {
  try {
    const db = readDatabase();
    const authData = getSellerFromRequest(req, db);

    if (!authData) {
      return res.status(401).json({ error: "No autorizado. Inicia sesión como vendedor." });
    }

    const { seller } = authData;
    const { product } = req.body;

    if (!product || !product.id || !product.name) {
      return res.status(400).json({ error: "Faltan datos obligatorios del producto (id, name)." });
    }

    if (!db["_sellers_catalogs"]) db["_sellers_catalogs"] = {};
    const existingCatalog = db["_sellers_catalogs"][seller.id] || {
      id: `cat-${seller.id.replace('seller-', '')}`,
      sellerId: seller.id,
      products: [],
      business: { name: seller.storeName || seller.name },
      settings: {}
    };

    const products: any[] = existingCatalog.products || [];
    const prodIndex = products.findIndex((p: any) => p.id === product.id);

    if (prodIndex >= 0) {
      products[prodIndex] = { ...products[prodIndex], ...product, updatedAt: new Date().toISOString() };
    } else {
      products.unshift({ ...product, createdAt: new Date().toISOString() });
    }

    existingCatalog.products = products;
    existingCatalog.updatedAt = new Date().toISOString();

    db["_sellers_catalogs"][seller.id] = existingCatalog;
    db[existingCatalog.id] = existingCatalog;
    writeDatabase(db);

    return res.json({
      success: true,
      message: `Producto "${product.name}" guardado exitosamente en tu catálogo.`,
      product,
      catalogId: existingCatalog.id,
      totalProducts: products.length,
    });
  } catch (error: any) {
    console.error("[Seller Add Product Error]:", error);
    return res.status(500).json({ error: "Error al guardar el producto en el catálogo." });
  }
});

// Eliminar un producto del catálogo del vendedor
app.delete("/api/seller/products/:productId", (req, res) => {
  try {
    const db = readDatabase();
    const authData = getSellerFromRequest(req, db);

    if (!authData) {
      return res.status(401).json({ error: "No autorizado. Inicia sesión como vendedor." });
    }

    const { seller } = authData;
    const { productId } = req.params;

    if (!db["_sellers_catalogs"] || !db["_sellers_catalogs"][seller.id]) {
      return res.status(404).json({ error: "No se encontró el catálogo del vendedor." });
    }

    const catalog = db["_sellers_catalogs"][seller.id];
    catalog.products = (catalog.products || []).filter((p: any) => p.id !== productId);
    catalog.updatedAt = new Date().toISOString();

    db["_sellers_catalogs"][seller.id] = catalog;
    db[catalog.id] = catalog;
    writeDatabase(db);

    return res.json({
      success: true,
      message: "Producto eliminado correctamente de tu catálogo.",
      totalProducts: catalog.products.length,
    });
  } catch (error: any) {
    console.error("[Seller Delete Product Error]:", error);
    return res.status(500).json({ error: "Error al eliminar el producto." });
  }
});

// 2.1 Store Profile: Get global store profile (business, contacts, logo, settings)
app.get("/api/store-profile", (req, res) => {
  try {
    const db = readDatabase();
    const profile = db["_store_profile"] || null;
    res.json({ success: true, profile });
  } catch (error: any) {
    console.error("Error al recuperar perfil de la tienda:", error);
    res.status(500).json({ error: "No se pudo recuperar la configuración de la tienda." });
  }
});

// 2.2 Store Profile: Save or update global store profile
app.post("/api/store-profile", (req, res) => {
  try {
    const { business, settings } = req.body;
    if (!business) {
      return res.status(400).json({ error: "Faltan datos de la tienda para guardar." });
    }

    const db = readDatabase();
    const currentProfile = db["_store_profile"] || {};

    const updatedProfile = {
      business: { ...currentProfile.business, ...business },
      settings: settings ? { ...currentProfile.settings, ...settings } : currentProfile.settings,
      updatedAt: new Date().toISOString()
    };

    db["_store_profile"] = updatedProfile;
    writeDatabase(db);

    res.json({ 
      success: true, 
      message: "Configuración, contactos y logotipo guardados exitosamente.",
      profile: updatedProfile 
    });
  } catch (error: any) {
    console.error("Error al guardar perfil de la tienda:", error);
    res.status(500).json({ error: "No se pudo guardar la configuración en el servidor.", details: error.message });
  }
});

// ============================================================================
// SELLER AUTHENTICATION ROUTES (Registro y Login para Vendedores)
// ============================================================================

// 1. Registro de nuevo Vendedor
app.post("/api/auth/register", (req, res) => {
  try {
    const { username, password, name, storeName, email } = req.body;

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return res.status(400).json({ error: "El nombre de usuario debe tener al menos 3 caracteres." });
    }

    if (!password || typeof password !== "string" || password.length < 4) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 4 caracteres." });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email && typeof email === "string" ? email.trim().toLowerCase() : `${cleanUsername}@tienda.com`;
    const cleanName = name && typeof name === "string" ? name.trim() : cleanUsername;
    const cleanStoreName = storeName && typeof storeName === "string" ? storeName.trim() : `Tienda ${cleanName}`;

    const db = readDatabase();
    if (!db["_sellers"]) db["_sellers"] = {};
    if (!db["_sessions"]) db["_sessions"] = {};

    // Check if username already registered
    const existingSellers = Object.values(db["_sellers"]) as any[];
    const existingSeller = existingSellers.find(
      (s) => s.username?.toLowerCase() === cleanUsername
    );

    if (existingSeller) {
      // If the password matches, treat as successful login
      const isMatch = verifyPassword(String(password), existingSeller.passwordHash, existingSeller.salt);
      if (isMatch) {
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        db["_sessions"][token] = {
          sellerId: existingSeller.id,
          username: cleanUsername,
          createdAt: new Date().toISOString(),
          expiresAt: expiresAt,
        };
        writeDatabase(db);
        return res.status(200).json({
          success: true,
          message: "¡Bienvenido a tu panel de vendedor!",
          token,
          seller: {
            id: existingSeller.id,
            username: existingSeller.username,
            email: existingSeller.email,
            name: existingSeller.name,
            storeName: existingSeller.storeName,
            createdAt: existingSeller.createdAt,
          },
        });
      }
      return res.status(409).json({ error: "El nombre de usuario ya está registrado. Inicia sesión con tu contraseña." });
    }

    const { hash, salt } = hashPassword(password);
    const sellerId = `seller-${Math.random().toString(36).substring(2, 10)}`;

    const newSeller = {
      id: sellerId,
      username: cleanUsername,
      email: cleanEmail,
      name: cleanName,
      storeName: cleanStoreName,
      passwordHash: hash,
      salt: salt,
      createdAt: new Date().toISOString(),
    };

    db["_sellers"][sellerId] = newSeller;

    // Create session token (valid for 30 days)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db["_sessions"][token] = {
      sellerId: sellerId,
      username: cleanUsername,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt,
    };

    writeDatabase(db);

    const safeSeller = {
      id: newSeller.id,
      username: newSeller.username,
      email: newSeller.email,
      name: newSeller.name,
      storeName: newSeller.storeName,
      createdAt: newSeller.createdAt,
    };

    console.log(`[Auth] Nuevo vendedor registrado exitosamente: ${cleanUsername} (${cleanStoreName})`);

    return res.status(201).json({
      success: true,
      message: "Registro exitoso. ¡Bienvenido a tu panel de vendedor!",
      token,
      seller: safeSeller,
    });
  } catch (error: any) {
    console.error("[Auth Register Error]:", error);
    return res.status(500).json({ error: "Error interno al procesar el registro de vendedor.", details: error.message });
  }
});

// 2. Inicio de Sesión de Vendedor (Login)
app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Por favor proporciona usuario y contraseña." });
    }

    const cleanInput = String(username).trim().toLowerCase();
    const db = readDatabase();
    const sellers = db["_sellers"] || {};
    const sellerList = Object.values(sellers) as any[];

    // Find seller by username or email
    const seller = sellerList.find(
      (s) => s.username?.toLowerCase() === cleanInput || s.email?.toLowerCase() === cleanInput
    );

    if (!seller) {
      // Auto-provision new seller profile seamlessly if credentials are provided
      const { hash, salt } = hashPassword(String(password));
      const sellerId = `seller-${Math.random().toString(36).substring(2, 10)}`;
      const formattedName = cleanInput === "chihuahua" ? "Luisana y Alex" : cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1);
      const formattedStore = cleanInput === "chihuahua" ? "Team Chihuahua" : `Tienda ${formattedName}`;

      const createdSeller = {
        id: sellerId,
        username: cleanInput,
        email: `${cleanInput}@tienda.com`,
        name: formattedName,
        storeName: formattedStore,
        passwordHash: hash,
        salt: salt,
        createdAt: new Date().toISOString(),
      };

      if (!db["_sellers"]) db["_sellers"] = {};
      db["_sellers"][sellerId] = createdSeller;

      if (!db["_sessions"]) db["_sessions"] = {};
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      db["_sessions"][token] = {
        sellerId: sellerId,
        username: cleanInput,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt,
      };

      writeDatabase(db);

      console.log(`[Auth] Vendedor auto-inicializado: ${cleanInput}`);

      return res.json({
        success: true,
        message: "¡Bienvenido a tu panel de vendedor!",
        token,
        seller: {
          id: createdSeller.id,
          username: createdSeller.username,
          email: createdSeller.email,
          name: createdSeller.name,
          storeName: createdSeller.storeName,
          createdAt: createdSeller.createdAt,
        },
      });
    }

    // Verify password
    const isMatch = verifyPassword(String(password), seller.passwordHash, seller.salt);
    if (!isMatch) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
    }

    if (!db["_sessions"]) db["_sessions"] = {};

    // Create session token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db["_sessions"][token] = {
      sellerId: seller.id,
      username: seller.username,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt,
    };

    writeDatabase(db);

    const safeSeller = {
      id: seller.id,
      username: seller.username,
      email: seller.email,
      name: seller.name,
      storeName: seller.storeName,
      createdAt: seller.createdAt,
    };

    console.log(`[Auth] Inicio de sesión exitoso: ${seller.username}`);

    return res.json({
      success: true,
      message: "Sesión iniciada correctamente.",
      token,
      seller: safeSeller,
    });
  } catch (error: any) {
    console.error("[Auth Login Error]:", error);
    return res.status(500).json({ error: "Error interno al iniciar sesión.", details: error.message });
  }
});

// 3. Obtener datos del Vendedor actual (Me)
app.get("/api/auth/me", (req, res) => {
  try {
    const db = readDatabase();
    const authData = getSellerFromRequest(req, db);

    if (!authData) {
      return res.status(401).json({ error: "No autorizado o sesión expirada." });
    }

    const { seller } = authData;
    const safeSeller = {
      id: seller.id,
      username: seller.username,
      email: seller.email,
      name: seller.name,
      storeName: seller.storeName,
      createdAt: seller.createdAt,
    };

    return res.json({
      success: true,
      seller: safeSeller,
    });
  } catch (error: any) {
    console.error("[Auth Me Error]:", error);
    return res.status(500).json({ error: "Error al verificar la sesión." });
  }
});

// 4. Cerrar Sesión (Logout)
app.post("/api/auth/logout", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const db = readDatabase();
      if (db["_sessions"] && db["_sessions"][token]) {
        delete db["_sessions"][token];
        writeDatabase(db);
      }
    }
    return res.json({ success: true, message: "Sesión cerrada correctamente." });
  } catch (error: any) {
    console.error("[Auth Logout Error]:", error);
    return res.status(500).json({ error: "Error al cerrar sesión." });
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
