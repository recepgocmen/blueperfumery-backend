/**
 * Analytics Service
 *
 * Chat session analitiği ve raporlama
 */

import { ChatSession } from "../models/ChatSession";

export interface AnalyticsOverview {
  totalSessions: number;
  todaySessions: number;
  thisWeekSessions: number;
  thisMonthSessions: number;
  totalMessages: number;
  uniqueVisitors: number;
  avgMessagesPerSession: number;
  avgSessionDuration: number; // minutes
}

export interface DeviceStats {
  device: string;
  count: number;
  percentage: number;
}

export interface BrowserStats {
  browser: string;
  count: number;
  percentage: number;
}

export interface TimeStats {
  hour: number;
  count: number;
}

export interface DailyStats {
  date: string;
  sessions: number;
  messages: number;
  uniqueVisitors: number;
}

export interface TopRecommendation {
  productId: string;
  productName: string;
  count: number;
}

export interface CommonQuestion {
  question: string;
  count: number;
}

/**
 * Genel istatistikler
 */
export async function getOverview(): Promise<AnalyticsOverview> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalSessions,
    todaySessions,
    thisWeekSessions,
    thisMonthSessions,
    totalMessagesResult,
    uniqueVisitors,
    avgDurationResult,
  ] = await Promise.all([
    ChatSession.countDocuments(),
    ChatSession.countDocuments({ createdAt: { $gte: today } }),
    ChatSession.countDocuments({ createdAt: { $gte: weekAgo } }),
    ChatSession.countDocuments({ createdAt: { $gte: monthAgo } }),
    ChatSession.aggregate([
      { $group: { _id: null, total: { $sum: "$messageCount" } } },
    ]),
    ChatSession.distinct("visitorId").then((arr) => arr.length),
    ChatSession.aggregate([
      {
        $project: {
          duration: {
            $divide: [
              { $subtract: ["$lastMessageAt", "$firstMessageAt"] },
              60000,
            ],
          },
        },
      },
      { $group: { _id: null, avg: { $avg: "$duration" } } },
    ]),
  ]);

  const totalMessages = totalMessagesResult[0]?.total || 0;
  const avgMessagesPerSession =
    totalSessions > 0 ? totalMessages / totalSessions : 0;
  const avgSessionDuration = avgDurationResult[0]?.avg || 0;

  return {
    totalSessions,
    todaySessions,
    thisWeekSessions,
    thisMonthSessions,
    totalMessages,
    uniqueVisitors,
    avgMessagesPerSession: Math.round(avgMessagesPerSession * 10) / 10,
    avgSessionDuration: Math.round(avgSessionDuration * 10) / 10,
  };
}

/**
 * Cihaz istatistikleri
 */
export async function getDeviceStats(): Promise<DeviceStats[]> {
  const result = await ChatSession.aggregate([
    { $group: { _id: "$device", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const total = result.reduce((sum, item) => sum + item.count, 0);

  return result.map((item) => ({
    device: item._id || "Unknown",
    count: item.count,
    percentage: Math.round((item.count / total) * 100),
  }));
}

/**
 * Tarayıcı istatistikleri
 */
export async function getBrowserStats(): Promise<BrowserStats[]> {
  const result = await ChatSession.aggregate([
    { $group: { _id: "$browser", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const total = result.reduce((sum, item) => sum + item.count, 0);

  return result.map((item) => ({
    browser: item._id || "Unknown",
    count: item.count,
    percentage: Math.round((item.count / total) * 100),
  }));
}

/**
 * Saat bazlı dağılım
 */
export async function getHourlyStats(): Promise<TimeStats[]> {
  const result = await ChatSession.aggregate([
    {
      $project: {
        hour: { $hour: "$createdAt" },
      },
    },
    { $group: { _id: "$hour", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // Tüm saatleri doldur (0-23)
  const hourlyData: TimeStats[] = [];
  for (let i = 0; i < 24; i++) {
    const found = result.find((item) => item._id === i);
    hourlyData.push({
      hour: i,
      count: found?.count || 0,
    });
  }

  return hourlyData;
}

/**
 * Günlük istatistikler (son 30 gün)
 */
export async function getDailyStats(days: number = 30): Promise<DailyStats[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const result = await ChatSession.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        sessions: { $sum: 1 },
        messages: { $sum: "$messageCount" },
        visitors: { $addToSet: "$visitorId" },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: "$_id",
        sessions: 1,
        messages: 1,
        uniqueVisitors: { $size: "$visitors" },
      },
    },
  ]);

  return result.map((item) => ({
    date: item._id,
    sessions: item.sessions,
    messages: item.messages,
    uniqueVisitors: item.uniqueVisitors,
  }));
}

/**
 * En çok önerilen ürünler
 */
export async function getTopRecommendations(
  limit: number = 10
): Promise<TopRecommendation[]> {
  const result = await ChatSession.aggregate([
    { $unwind: "$messages" },
    { $unwind: "$messages.recommendedProducts" },
    {
      $group: {
        _id: {
          id: "$messages.recommendedProducts.id",
          name: "$messages.recommendedProducts.name",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return result.map((item) => ({
    productId: item._id.id,
    productName: item._id.name,
    count: item.count,
  }));
}

/**
 * En sık sorulan sorular / konular
 */
export async function getCommonQuestions(
  limit: number = 20
): Promise<CommonQuestion[]> {
  // Kullanıcı mesajlarını al ve keyword analizi yap
  const result = await ChatSession.aggregate([
    { $unwind: "$messages" },
    { $match: { "messages.role": "user" } },
    {
      $project: {
        content: { $toLower: "$messages.content" },
      },
    },
    { $group: { _id: "$content", count: { $sum: 1 } } },
    { $match: { count: { $gte: 2 } } }, // En az 2 kez sorulmuş
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return result.map((item) => ({
    question: item._id,
    count: item.count,
  }));
}

/**
 * Conversion rate (öneri yapılan vs ürün linki tıklanan)
 * Not: Şimdilik basit bir hesaplama - ürün önerilen session sayısı
 */
export async function getConversionStats(): Promise<{
  sessionsWithRecommendations: number;
  totalSessions: number;
  conversionRate: number;
}> {
  const [sessionsWithRecommendations, totalSessions] = await Promise.all([
    ChatSession.countDocuments({
      "messages.recommendedProducts": { $exists: true, $ne: [] },
    }),
    ChatSession.countDocuments(),
  ]);

  return {
    sessionsWithRecommendations,
    totalSessions,
    conversionRate:
      totalSessions > 0
        ? Math.round((sessionsWithRecommendations / totalSessions) * 100)
        : 0,
  };
}

/**
 * Tüm analytics verilerini tek seferde getir
 */
export async function getFullAnalytics(): Promise<{
  overview: AnalyticsOverview;
  deviceStats: DeviceStats[];
  browserStats: BrowserStats[];
  hourlyStats: TimeStats[];
  dailyStats: DailyStats[];
  topRecommendations: TopRecommendation[];
  commonQuestions: CommonQuestion[];
  conversionStats: {
    sessionsWithRecommendations: number;
    totalSessions: number;
    conversionRate: number;
  };
}> {
  const [
    overview,
    deviceStats,
    browserStats,
    hourlyStats,
    dailyStats,
    topRecommendations,
    commonQuestions,
    conversionStats,
  ] = await Promise.all([
    getOverview(),
    getDeviceStats(),
    getBrowserStats(),
    getHourlyStats(),
    getDailyStats(),
    getTopRecommendations(),
    getCommonQuestions(),
    getConversionStats(),
  ]);

  return {
    overview,
    deviceStats,
    browserStats,
    hourlyStats,
    dailyStats,
    topRecommendations,
    commonQuestions,
    conversionStats,
  };
}
