/**
 * Agent API Routes
 * 
 * AI Agent'lara erişim için API endpoint'leri
 */

import { Router, Request, Response } from "express";
import { getLibrarianAgent } from "../agents/librarian/LibrarianAgent";

const router = Router();

// Rate limiting için basit bir cache
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const requestCache = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60000; // 1 dakika
const MAX_REQUESTS = 10; // Dakikada max 10 istek

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = requestCache.get(ip);
  
  // İlk istek veya zaman aşımı
  if (!entry || now > entry.resetTime) {
    requestCache.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }
  
  // Rate limit aşıldı
  if (entry.count >= MAX_REQUESTS) {
    return false;
  }
  
  // İsteği say
  entry.count++;
  requestCache.set(ip, entry);
  
  // Eski kayıtları temizle (her 100 istekte bir)
  if (requestCache.size > 1000) {
    const keysToDelete: string[] = [];
    requestCache.forEach((value, key) => {
      if (now > value.resetTime) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => requestCache.delete(key));
  }
  
  return true;
}

/**
 * POST /api/agent/chat
 * Serbest soru-cevap
 */
router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    console.log("📨 Chat request received:", {
      body: req.body,
      ip: req.ip,
      headers: {
        "x-forwarded-for": req.headers["x-forwarded-for"],
        "x-real-ip": req.headers["x-real-ip"],
      },
    });

    const { message, perfumeId } = req.body;
    
    // IP adresini al (proxy desteği ile)
    const clientIp = 
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req.headers["x-real-ip"] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      "unknown";

    console.log("🔍 Request validation:", { message, perfumeId, clientIp });

    if (!message || typeof message !== "string") {
      console.warn("⚠️ Invalid message:", message);
      res.status(400).json({
        success: false,
        error: "Mesaj gerekli",
      });
      return;
    }

    if (message.length > 500) {
      console.warn("⚠️ Message too long:", message.length);
      res.status(400).json({
        success: false,
        error: "Mesaj çok uzun (max 500 karakter)",
      });
      return;
    }

    // Rate limit kontrolü
    if (!checkRateLimit(clientIp)) {
      console.warn("⚠️ Rate limit exceeded for IP:", clientIp);
      res.status(429).json({
        success: false,
        error: "Çok fazla istek. Lütfen biraz bekleyin.",
      });
      return;
    }

    console.log("🤖 Getting Librarian Agent...");
    const librarian = getLibrarianAgent();
    
    console.log("💬 Calling askAboutPerfume...");
    const response = await librarian.askAboutPerfume(message, perfumeId);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Chat response generated in ${duration}ms`);

    res.status(200).json({
      success: true,
      data: {
        message: response,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error("❌ Agent chat error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      status: error.status,
      type: error.type,
      duration: `${duration}ms`,
    });
    console.error("Request body:", req.body);
    
    // AI servisi kullanılamıyor
    if (error.message === "AI_SERVICE_UNAVAILABLE") {
      console.error("🔴 AI Service Unavailable");
      res.status(503).json({
        success: false,
        error: "AI asistan şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
        code: "AI_SERVICE_UNAVAILABLE",
      });
      return;
    }
    
    // Daha detaylı hata mesajı (development için)
    const errorMessage = process.env.NODE_ENV === "development" 
      ? error.message || "Bir hata oluştu. Lütfen tekrar deneyin."
      : "Bir hata oluştu. Lütfen tekrar deneyin.";
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      ...(process.env.NODE_ENV === "development" && { 
        details: error.stack,
        errorName: error.name,
      }),
    });
  }
});

/**
 * POST /api/agent/analyze
 * Parfüm analizi
 */
router.post("/analyze", async (req: Request, res: Response): Promise<void> => {
  try {
    const { perfumeId } = req.body;

    if (!perfumeId) {
      res.status(400).json({
        success: false,
        error: "Parfüm ID gerekli",
      });
      return;
    }

    const librarian = getLibrarianAgent();
    const analysis = await librarian.analyzePerfume(perfumeId);

    if (!analysis) {
      res.status(404).json({
        success: false,
        error: "Parfüm bulunamadı",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error("Agent analyze error:", error);
    
    if (error.message === "AI_SERVICE_UNAVAILABLE") {
      res.status(503).json({
        success: false,
        error: "AI asistan şu an kullanılamıyor.",
        code: "AI_SERVICE_UNAVAILABLE",
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: "Bir hata oluştu",
    });
  }
});

/**
 * POST /api/agent/similar
 * Benzer parfümler
 */
router.post("/similar", async (req: Request, res: Response): Promise<void> => {
  try {
    const { perfumeId, limit = 3 } = req.body;

    if (!perfumeId) {
      res.status(400).json({
        success: false,
        error: "Parfüm ID gerekli",
      });
      return;
    }

    const librarian = getLibrarianAgent();
    const similar = await librarian.findSimilarPerfumes(perfumeId, limit);

    res.status(200).json({
      success: true,
      data: similar,
    });
  } catch (error: any) {
    console.error("Agent similar error:", error);
    
    if (error.message === "AI_SERVICE_UNAVAILABLE") {
      res.status(503).json({
        success: false,
        error: "AI asistan şu an kullanılamıyor.",
        code: "AI_SERVICE_UNAVAILABLE",
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: "Bir hata oluştu",
    });
  }
});

export default router;
