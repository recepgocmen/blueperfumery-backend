import express, { Request, Response } from "express";
import { ChatSession } from "../models/ChatSession";
import {
  getOverview,
  getDeviceStats,
  getBrowserStats,
  getHourlyStats,
  getDailyStats,
  getTopRecommendations,
  getCommonQuestions,
  getConversionStats,
  getFullAnalytics,
} from "../services/analyticsService";

const router = express.Router();

// User-Agent'ı parse et
function parseUserAgent(ua: string): {
  device: string;
  browser: string;
  os: string;
} {
  let device = "Desktop";
  let browser = "Unknown";
  let os = "Unknown";

  // Device
  if (/mobile/i.test(ua)) device = "Mobile";
  else if (/tablet/i.test(ua)) device = "Tablet";
  else if (/ipad/i.test(ua)) device = "Tablet";

  // Browser
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = "Chrome";
  else if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/edge/i.test(ua)) browser = "Edge";
  else if (/opera|opr/i.test(ua)) browser = "Opera";

  // OS
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";

  return { device, browser, os };
}

/**
 * POST /api/chat-sessions
 * Yeni session oluştur veya mevcut session'a mesaj ekle
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, visitorId, message, role, recommendedProducts } =
      req.body;

    if (!sessionId || !visitorId || !message || !role) {
      res.status(400).json({
        success: false,
        error: "sessionId, visitorId, message ve role gerekli",
      });
      return;
    }

    const userAgent = req.headers["user-agent"] || "";
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress ||
      "";
    const { device, browser, os } = parseUserAgent(userAgent);

    const chatMessage = {
      role,
      content: message,
      timestamp: new Date(),
      recommendedProducts,
    };

    // Mevcut session'ı bul veya yeni oluştur
    let session = await ChatSession.findOne({ sessionId });

    if (session) {
      // Mevcut session'a mesaj ekle
      session.messages.push(chatMessage);
      session.messageCount = session.messages.length;
      session.lastMessageAt = new Date();
      session.isActive = true;
      await session.save();
    } else {
      // Yeni session oluştur
      session = await ChatSession.create({
        sessionId,
        visitorId,
        userAgent,
        ip,
        device,
        browser,
        os,
        messages: [chatMessage],
        messageCount: 1,
        firstMessageAt: new Date(),
        lastMessageAt: new Date(),
        isActive: true,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        messageCount: session.messageCount,
      },
    });
  } catch (error) {
    console.error("Chat session error:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
});

/**
 * GET /api/chat-sessions
 * Tüm session'ları listele (Admin için)
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      ChatSession.find()
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-messages") // Mesajları listede gösterme
        .lean(),
      ChatSession.countDocuments(),
    ]);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get chat sessions error:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
});

/**
 * GET /api/chat-sessions/:sessionId
 * Tek bir session'ın detayları (mesajlar dahil)
 */
router.get(
  "/:sessionId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      const session = await ChatSession.findOne({ sessionId }).lean();

      if (!session) {
        res.status(404).json({
          success: false,
          error: "Session bulunamadı",
        });
        return;
      }

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      console.error("Get chat session error:", error);
      res.status(500).json({
        success: false,
        error: "Sunucu hatası",
      });
    }
  }
);

/**
 * DELETE /api/chat-sessions/:sessionId
 * Session sil
 */
router.delete(
  "/:sessionId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      const result = await ChatSession.deleteOne({ sessionId });

      if (result.deletedCount === 0) {
        res.status(404).json({
          success: false,
          error: "Session bulunamadı",
        });
        return;
      }

      res.json({
        success: true,
        message: "Session silindi",
      });
    } catch (error) {
      console.error("Delete chat session error:", error);
      res.status(500).json({
        success: false,
        error: "Sunucu hatası",
      });
    }
  }
);

/**
 * GET /api/chat-sessions/stats/overview
 * Genel istatistikler
 */
router.get(
  "/stats/overview",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const overview = await getOverview();
      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      console.error("Get chat stats error:", error);
      res.status(500).json({
        success: false,
        error: "Sunucu hatası",
      });
    }
  }
);

/**
 * GET /api/chat-sessions/stats/full
 * Tüm analytics verileri
 */
router.get(
  "/stats/full",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const analytics = await getFullAnalytics();
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error("Get full analytics error:", error);
      res.status(500).json({
        success: false,
        error: "Sunucu hatası",
      });
    }
  }
);

/**
 * GET /api/chat-sessions/stats/devices
 * Cihaz istatistikleri
 */
router.get(
  "/stats/devices",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const deviceStats = await getDeviceStats();
      res.json({
        success: true,
        data: deviceStats,
      });
    } catch (error) {
      console.error("Get device stats error:", error);
      res.status(500).json({
        success: false,
        error: "Sunucu hatası",
      });
    }
  }
);

/**
 * GET /api/chat-sessions/stats/browsers
 * Tarayıcı istatistikleri
 */
router.get(
  "/stats/browsers",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const browserStats = await getBrowserStats();
      res.json({
        success: true,
        data: browserStats,
      });
    } catch (error) {
      console.error("Get browser stats error:", error);
      res.status(500).json({
        success: false,
        error: "Sunucu hatası",
      });
    }
  }
);

/**
 * GET /api/chat-sessions/stats/hourly
 * Saat bazlı dağılım
 */
router.get(
  "/stats/hourly",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const hourlyStats = await getHourlyStats();
      res.json({
        success: true,
        data: hourlyStats,
      });
    } catch (error) {
      console.error("Get hourly stats error:", error);
      res.status(500).json({
        success: false,
        error: "Sunucu hatası",
      });
    }
  }
);

/**
 * GET /api/chat-sessions/stats/daily
 * Günlük istatistikler
 */
router.get(
  "/stats/daily",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const dailyStats = await getDailyStats(days);
      res.json({
        success: true,
        data: dailyStats,
      });
    } catch (error) {
      console.error("Get daily stats error:", error);
      res.status(500).json({
        success: false,
        error: "Sunucu hatası",
      });
    }
  }
);

/**
 * GET /api/chat-sessions/stats/top-recommendations
 * En çok önerilen ürünler
 */
router.get(
  "/stats/top-recommendations",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topRecommendations = await getTopRecommendations(limit);
      res.json({
        success: true,
        data: topRecommendations,
      });
    } catch (error) {
      console.error("Get top recommendations error:", error);
      res.status(500).json({
        success: false,
        error: "Sunucu hatası",
      });
    }
  }
);

/**
 * GET /api/chat-sessions/stats/common-questions
 * Sık sorulan sorular
 */
router.get(
  "/stats/common-questions",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const commonQuestions = await getCommonQuestions(limit);
      res.json({
        success: true,
        data: commonQuestions,
      });
    } catch (error) {
      console.error("Get common questions error:", error);
      res.status(500).json({
        success: false,
        error: "Sunucu hatası",
      });
    }
  }
);

/**
 * GET /api/chat-sessions/stats/conversion
 * Conversion istatistikleri
 */
router.get(
  "/stats/conversion",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const conversionStats = await getConversionStats();
      res.json({
        success: true,
        data: conversionStats,
      });
    } catch (error) {
      console.error("Get conversion stats error:", error);
      res.status(500).json({
        success: false,
        error: "Sunucu hatası",
      });
    }
  }
);

export default router;
