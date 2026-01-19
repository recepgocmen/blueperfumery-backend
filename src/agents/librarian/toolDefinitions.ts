/**
 * Tool Definitions for Claude API
 *
 * Bu dosya, Claude Sonnet'in kullanacağı tool tanımlarını içerir.
 * MCP server'daki tool'ların aynısı, Claude API formatında.
 */

import Anthropic from "@anthropic-ai/sdk";

// Tool tipi
export type ToolName =
  | "search_perfumes"
  | "get_perfume_details"
  | "list_all_perfumes"
  | "get_perfumes_by_category"
  | "recommend_perfumes"
  | "get_purchase_link";

// Tool tanımları - Claude API formatında
export const PERFUME_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_perfumes",
    description:
      "Parfüm ara. İsim, marka, nota veya özellik ile arama yapabilir. Örnek: 'odunsu erkek parfümü', 'Dior', 'vanilya notası'",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Arama sorgusu - parfüm adı, marka, nota veya özellik",
        },
        gender: {
          type: "string",
          enum: ["male", "female", "unisex"],
          description: "Cinsiyet filtresi (opsiyonel)",
        },
        maxPrice: {
          type: "number",
          description: "Maksimum fiyat filtresi TL cinsinden (opsiyonel)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_perfume_details",
    description:
      "Belirli bir parfümün detaylı bilgilerini getir. ID veya isim ile sorgulama yapabilir.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Parfüm ID'si",
        },
        name: {
          type: "string",
          description: "Parfüm adı (ID yoksa isimle arama yapar)",
        },
      },
      required: [],
    },
  },
  {
    name: "list_all_perfumes",
    description:
      "Koleksiyondaki tüm parfümleri listele. Opsiyonel olarak cinsiyet veya kategori ile filtreleyebilir.",
    input_schema: {
      type: "object" as const,
      properties: {
        gender: {
          type: "string",
          enum: ["male", "female", "unisex"],
          description: "Cinsiyet filtresi (opsiyonel)",
        },
        category: {
          type: "string",
          enum: [
            "woman",
            "man",
            "unisex",
            "niches",
            "urban",
            "classic",
            "luxury",
            "premium",
            "exclusive",
            "artisanal",
          ],
          description: "Kategori filtresi (opsiyonel)",
        },
        limit: {
          type: "number",
          description: "Maksimum sonuç sayısı (varsayılan: 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_perfumes_by_category",
    description:
      "Belirli bir kategorideki parfümleri getir. Erkek, kadın veya niş parfümler.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["men", "women", "niche", "unisex"],
          description: "Kategori: 'men', 'women', 'niche' veya 'unisex'",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "recommend_perfumes",
    description:
      "Kullanıcı profiline göre parfüm öner. Cinsiyet, mevsim, kullanım ortamı, tercih edilen notalar gibi kriterlere göre öneri yapar.",
    input_schema: {
      type: "object" as const,
      properties: {
        gender: {
          type: "string",
          enum: ["male", "female", "unisex"],
          description: "Kullanıcının cinsiyeti",
        },
        season: {
          type: "string",
          enum: ["summer", "winter", "spring", "autumn", "all"],
          description: "Hangi mevsimde kullanılacak",
        },
        occasion: {
          type: "string",
          enum: ["daily", "work", "night", "special", "sport"],
          description: "Kullanım ortamı",
        },
        preferredNotes: {
          type: "array",
          items: { type: "string" },
          description:
            "Tercih edilen notalar (örn: ['vanilya', 'oud', 'çiçeksi'])",
        },
        avoidNotes: {
          type: "array",
          items: { type: "string" },
          description: "Kaçınılacak notalar",
        },
        intensity: {
          type: "string",
          enum: ["light", "medium", "strong"],
          description: "İstenen yoğunluk seviyesi",
        },
        maxPrice: {
          type: "number",
          description: "Maksimum bütçe TL cinsinden",
        },
        limit: {
          type: "number",
          description: "Maksimum öneri sayısı (varsayılan: 3)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_purchase_link",
    description: "Belirli bir parfümün satın alma linkini getir (Shopier).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Parfüm ID'si",
        },
        name: {
          type: "string",
          description: "Parfüm adı (ID yoksa isimle arama yapar)",
        },
      },
      required: [],
    },
  },
];

// Tool adından tool tanımını bul
export function getToolDefinition(
  name: ToolName
): Anthropic.Tool | undefined {
  return PERFUME_TOOLS.find((tool) => tool.name === name);
}

// Tüm tool isimlerini getir
export function getToolNames(): ToolName[] {
  return PERFUME_TOOLS.map((tool) => tool.name as ToolName);
}
