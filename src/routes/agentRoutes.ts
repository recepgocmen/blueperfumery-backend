/**
 * Agent API Routes
 * 
 * AI Agent'lara erişim için API endpoint'leri
 */

import { Router, Request, Response } from "express";
import { getLibrarianAgent } from "../agents/librarian/LibrarianAgent";

const router = Router();

// Rate limiting için basit bir cache
const requestCache = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1 dakika
const MAX_REQUESTS = 10; // Dakikada max 10 istek

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const lastRequest = requestCache.get(ip) || 0;
  
  // Eski kayıtları temizle
  if (now - lastRequest > RATE_LIMIT_WINDOW) {
    requestCache.set(ip, now);
    return true;
  }
  
  const count = Array.from(requestCache.entries())
    .filter(([key, time]) => key.startsWith(ip) && now - time < RATE_LIMIT_WINDOW)
    .length;
  
  if (count >= MAX_REQUESTS) {
    return false;
  }
  
  requestCache.set(`${ip}-${now}`, now);
  return true;
}

/**
 * POST /api/agent/chat
 * Serbest soru-cevap
 */
router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, perfumeId } = req.body;
    const clientIp = req.ip || "unknown";

    if (!message || typeof message !== "string") {
      res.status(400).json({
        success: false,
        error: "Mesaj gerekli",
      });
      return;
    }

    if (message.length > 500) {
      res.status(400).json({
        success: false,
        error: "Mesaj çok uzun (max 500 karakter)",
      });
      return;
    }

    // Rate limit kontrolü
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        success: false,
        error: "Çok fazla istek. Lütfen biraz bekleyin.",
      });
      return;
    }

    const librarian = getLibrarianAgent();
    const response = await librarian.askAboutPerfume(message, perfumeId);

    res.status(200).json({
      success: true,
      data: {
        message: response,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Agent chat error:", error);
    res.status(500).json({
      success: false,
      error: "Bir hata oluştu. Lütfen tekrar deneyin.",
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
    res.status(500).json({
      success: false,
      error: "Bir hata oluştu",
    });
  }
});

export default router;
