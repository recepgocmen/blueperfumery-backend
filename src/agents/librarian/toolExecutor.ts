/**
 * Tool Executor - Tool Çalıştırıcı
 *
 * Claude Sonnet'in çağırdığı tool'ları çalıştırır.
 * MCP server'daki fonksiyonların aynısı.
 */

import { Product } from "../../models/Product";
import {
  retrieveRelevantProducts,
  recommendByProfile,
} from "../../services/ragService";
import { ToolName } from "./toolDefinitions";

// Tool çıktı tipi
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Ana tool executor - tool adı ve argümanları alır, sonuç döner
 */
export async function executeTool(
  name: ToolName,
  args: Record<string, any>
): Promise<ToolResult> {
  try {
    switch (name) {
      case "search_perfumes":
        return await searchPerfumes(args as { query: string; gender?: string; maxPrice?: number });

      case "get_perfume_details":
        return await getPerfumeDetails(args as { id?: string; name?: string });

      case "list_all_perfumes":
        return await listAllPerfumes(args as { gender?: string; category?: string; limit?: number });

      case "get_perfumes_by_category":
        return await getPerfumesByCategory(args as { category: string });

      case "recommend_perfumes":
        return await recommendPerfumes(args as any);

      case "get_purchase_link":
        return await getPurchaseLink(args as { id?: string; name?: string });

      default:
        return {
          success: false,
          error: `Bilinmeyen tool: ${name}`,
        };
    }
  } catch (error: any) {
    console.error(`Tool execution error [${name}]:`, error);
    return {
      success: false,
      error: error.message || "Tool çalıştırma hatası",
    };
  }
}

/**
 * Parfüm ara
 */
async function searchPerfumes(args: {
  query: string;
  gender?: string;
  maxPrice?: number;
}): Promise<ToolResult> {
  const { query, gender, maxPrice } = args;

  if (!query) {
    return { success: false, error: "Arama sorgusu gerekli" };
  }

  // RAG service ile ara
  const ragResult = await retrieveRelevantProducts(query, 10, {
    gender: gender,
    maxPrice: maxPrice,
  });

  // Sonuçları formatla
  const perfumes = ragResult.products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    gender: p.gender,
    price: p.price,
    ml: p.ml,
    notes: p.notes,
    characteristics: p.characteristics,
    description: p.description.substring(0, 150) + "...",
    relevanceScore: p.score,
  }));

  return {
    success: true,
    data: {
      query,
      totalFound: ragResult.totalFound,
      results: perfumes,
    },
  };
}

/**
 * Parfüm detayı getir
 */
async function getPerfumeDetails(args: {
  id?: string;
  name?: string;
}): Promise<ToolResult> {
  const { id, name } = args;

  if (!id && !name) {
    return { success: false, error: "ID veya isim gerekli" };
  }

  let perfume;

  if (id) {
    perfume = await Product.findOne({ id, status: "active" }).lean();
  } else if (name) {
    perfume = await Product.findOne({
      status: "active",
      $or: [
        { name: { $regex: name, $options: "i" } },
        { brand: { $regex: name, $options: "i" } },
      ],
    }).lean();
  }

  if (!perfume) {
    return {
      success: false,
      error: `Parfüm bulunamadı: ${id || name}`,
    };
  }

  return {
    success: true,
    data: {
      id: (perfume as any).id,
      name: (perfume as any).name,
      brand: (perfume as any).brand,
      description: (perfume as any).description,
      gender: (perfume as any).gender,
      category: (perfume as any).category,
      price: (perfume as any).price,
      ml: (perfume as any).ml,
      notes: (perfume as any).notes,
      characteristics: (perfume as any).characteristics,
      ageRange: (perfume as any).ageRange,
      shopierLink: (perfume as any).shopierLink,
      stock: (perfume as any).stock,
    },
  };
}

/**
 * Tüm parfümleri listele
 */
async function listAllPerfumes(args: {
  gender?: string;
  category?: string;
  limit?: number;
}): Promise<ToolResult> {
  const { gender, category, limit = 10 } = args;

  const filter: any = { status: "active" };

  if (gender) {
    filter.gender = gender;
  }
  if (category) {
    filter.category = category;
  }

  const perfumes = await Product.find(filter)
    .limit(limit)
    .select("id name brand gender category price ml notes characteristics")
    .lean();

  return {
    success: true,
    data: {
      count: perfumes.length,
      perfumes: perfumes.map((p: any) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        gender: p.gender,
        category: p.category,
        price: p.price,
        ml: p.ml,
        notes: p.notes?.slice(0, 3) || [],
        characteristics: p.characteristics?.slice(0, 3) || [],
      })),
    },
  };
}

/**
 * Kategoriye göre parfüm getir
 */
async function getPerfumesByCategory(args: {
  category: string;
}): Promise<ToolResult> {
  const { category } = args;

  if (!category) {
    return { success: false, error: "Kategori gerekli" };
  }

  const filter: any = { status: "active" };

  switch (category.toLowerCase()) {
    case "men":
    case "male":
    case "erkek":
      filter.$or = [{ gender: "male" }, { gender: "unisex" }];
      break;
    case "women":
    case "female":
    case "kadın":
      filter.$or = [{ gender: "female" }, { gender: "unisex" }];
      break;
    case "niche":
    case "niş":
      filter.$or = [
        { category: "niches" },
        { category: "exclusive" },
        { category: "artisanal" },
        { category: "premium" },
      ];
      break;
    case "unisex":
      filter.gender = "unisex";
      break;
    default:
      filter.category = category;
  }

  const perfumes = await Product.find(filter)
    .select("id name brand gender category price ml notes")
    .lean();

  return {
    success: true,
    data: {
      category,
      count: perfumes.length,
      perfumes: perfumes.map((p: any) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        gender: p.gender,
        price: p.price,
        notes: p.notes?.slice(0, 3) || [],
      })),
    },
  };
}

/**
 * Profil bazlı öneri
 */
async function recommendPerfumes(args: {
  gender?: string;
  season?: string;
  occasion?: string;
  preferredNotes?: string[];
  avoidNotes?: string[];
  intensity?: string;
  maxPrice?: number;
  limit?: number;
}): Promise<ToolResult> {
  const { gender, season, occasion, preferredNotes, intensity, limit = 3 } = args;

  // RAG service ile öneri al
  const ragResult = await recommendByProfile({
    gender: gender === "male" ? "erkek" : gender === "female" ? "kadın" : "unisex",
    season: mapSeason(season),
    occasion: mapOccasion(occasion),
    preferredNotes: preferredNotes,
    intensity: mapIntensity(intensity),
  });

  const recommendations = ragResult.products.slice(0, limit);

  return {
    success: true,
    data: {
      criteria: { gender, season, occasion, preferredNotes, intensity },
      count: recommendations.length,
      recommendations: recommendations.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        gender: p.gender,
        price: p.price,
        ml: p.ml,
        notes: p.notes,
        characteristics: p.characteristics,
        description: p.description.substring(0, 200),
        matchScore: p.score,
        whyRecommended: generateRecommendationReason(p, args),
      })),
    },
  };
}

/**
 * Satın alma linki getir
 */
async function getPurchaseLink(args: {
  id?: string;
  name?: string;
}): Promise<ToolResult> {
  const { id, name } = args;

  if (!id && !name) {
    return { success: false, error: "ID veya isim gerekli" };
  }

  let perfume;

  if (id) {
    perfume = await Product.findOne({ id, status: "active" }).lean();
  } else if (name) {
    perfume = await Product.findOne({
      status: "active",
      name: { $regex: name, $options: "i" },
    }).lean();
  }

  if (!perfume) {
    return {
      success: false,
      error: `Parfüm bulunamadı: ${id || name}`,
    };
  }

  const p = perfume as any;

  if (!p.shopierLink) {
    return {
      success: false,
      error: `${p.name} için satın alma linki mevcut değil`,
    };
  }

  return {
    success: true,
    data: {
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      purchaseLink: p.shopierLink,
      message: `${p.name} parfümünü Shopier üzerinden satın alabilirsiniz.`,
    },
  };
}

// Yardımcı fonksiyonlar

function mapSeason(season?: string): string | undefined {
  if (!season) return undefined;
  const map: Record<string, string> = {
    summer: "yaz",
    winter: "kış",
    spring: "ilkbahar",
    autumn: "sonbahar",
    fall: "sonbahar",
    all: undefined as any,
  };
  return map[season.toLowerCase()] || season;
}

function mapOccasion(occasion?: string): string | undefined {
  if (!occasion) return undefined;
  const map: Record<string, string> = {
    daily: "günlük",
    work: "iş",
    night: "gece",
    special: "özel",
    sport: "spor",
  };
  return map[occasion.toLowerCase()] || occasion;
}

function mapIntensity(intensity?: string): string | undefined {
  if (!intensity) return undefined;
  const map: Record<string, string> = {
    light: "hafif",
    medium: "orta",
    strong: "yoğun",
  };
  return map[intensity.toLowerCase()] || intensity;
}

function generateRecommendationReason(
  product: any,
  criteria: any
): string {
  const reasons: string[] = [];

  if (criteria.gender) {
    reasons.push(
      `${criteria.gender === "male" ? "erkek" : "kadın"} için uygun`
    );
  }

  if (criteria.season) {
    reasons.push(`${mapSeason(criteria.season)} mevsimi için ideal`);
  }

  if (criteria.occasion) {
    reasons.push(`${mapOccasion(criteria.occasion)} kullanımı için`);
  }

  if (product.notes && product.notes.length > 0) {
    reasons.push(`${product.notes.slice(0, 2).join(", ")} notaları`);
  }

  return reasons.length > 0
    ? reasons.join(", ")
    : "Koleksiyonumuzda popüler bir seçim";
}
