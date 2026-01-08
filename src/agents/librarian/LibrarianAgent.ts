/**
 * Librarian Agent - Parfüm Bilgi Uzmanı
 *
 * Parfüm verilerini zenginleştirir, analiz eder ve benzer parfümleri bulur.
 */

import Anthropic from "@anthropic-ai/sdk";
import { Product } from "../../models/Product";

// Agent response tipleri
export interface EnrichedPerfumeProfile {
  id: string;
  name: string;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  fragranceFamily: string;
  mood: string[];
  bestSeasons: string[];
  bestOccasions: string[];
  longevityScore: number;
  sillageScore: number;
  description: string;
}

export interface SimilarPerfume {
  id: string;
  name: string;
  similarity: number;
  reason: string;
}

export interface PerfumeAnalysis {
  summary: string;
  strengths: string[];
  idealFor: string[];
  pairingNotes: string[];
}

export class LibrarianAgent {
  private client: Anthropic | null = null;
  private model: string = "claude-3-haiku-20240307"; // Hızlı ve ucuz
  private apiKeyMissing: boolean = false;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn(
        "⚠️ ANTHROPIC_API_KEY bulunamadı! Agent özellikleri devre dışı."
      );
      this.apiKeyMissing = true;
    } else {
      this.client = new Anthropic({ apiKey });
    }
  }

  /**
   * API key kontrolü - her metodda kullanılacak
   */
  private checkApiKey(): void {
    if (this.apiKeyMissing || !this.client) {
      throw new Error("AI_SERVICE_UNAVAILABLE");
    }
  }

  /**
   * Parfüm profilini zenginleştirir
   */
  async enrichPerfumeProfile(
    perfumeId: string
  ): Promise<EnrichedPerfumeProfile | null> {
    this.checkApiKey();

    const perfume = await Product.findOne({ id: perfumeId });
    if (!perfume) return null;

    const prompt = `Sen bir parfüm uzmanısın. Aşağıdaki parfümü analiz et ve JSON formatında zenginleştirilmiş profil oluştur.

Parfüm: ${perfume.name}
Marka: ${perfume.brand}
Mevcut Notalar: ${perfume.notes.join(", ")}
Karakteristikler: ${perfume.characteristics.join(", ")}
Cinsiyet: ${perfume.gender}
Açıklama: ${perfume.description}

Lütfen şu JSON formatında yanıt ver (sadece JSON, başka bir şey yazma):
{
  "topNotes": ["nota1", "nota2", "nota3"],
  "heartNotes": ["nota1", "nota2", "nota3"],
  "baseNotes": ["nota1", "nota2"],
  "fragranceFamily": "çiçeksi/odunsu/oryantal/taze/fougere",
  "mood": ["romantik", "enerjik", "sofistike"],
  "bestSeasons": ["ilkbahar", "yaz", "sonbahar", "kış"],
  "bestOccasions": ["günlük", "iş", "gece", "özel"],
  "longevityScore": 7,
  "sillageScore": 6,
  "description": "Kısa ve etkileyici açıklama"
}`;

    try {
      const response = await this.client!.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") return null;

      const parsed = JSON.parse(content.text);

      return {
        id: perfume.id,
        name: perfume.name,
        ...parsed,
      };
    } catch (error) {
      console.error("Librarian Agent Error:", error);
      return null;
    }
  }

  /**
   * Benzer parfümleri bulur
   */
  async findSimilarPerfumes(
    perfumeId: string,
    limit: number = 3
  ): Promise<SimilarPerfume[]> {
    this.checkApiKey();

    const perfume = await Product.findOne({ id: perfumeId });
    if (!perfume) return [];

    const allPerfumes = await Product.find({
      id: { $ne: perfumeId },
      status: "active",
    });

    const prompt = `Sen bir parfüm uzmanısın. Aşağıdaki parfüme en çok benzeyen ${limit} parfümü bul.

Ana Parfüm: ${perfume.name}
Notaları: ${perfume.notes.join(", ")}
Karakteristikleri: ${perfume.characteristics.join(", ")}
Cinsiyet: ${perfume.gender}

Karşılaştırılacak Parfümler:
${allPerfumes
  .map(
    (p) =>
      `- ${p.name} (${p.id}): ${p.notes.join(", ")} | ${p.characteristics.join(
        ", "
      )} | ${p.gender}`
  )
  .join("\n")}

Lütfen şu JSON formatında yanıt ver (sadece JSON array, başka bir şey yazma):
[
  {"id": "parfum-id", "name": "Parfüm Adı", "similarity": 85, "reason": "Neden benzer olduğunun kısa açıklaması"},
  ...
]`;

    try {
      const response = await this.client!.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") return [];

      return JSON.parse(content.text);
    } catch (error) {
      console.error("Librarian Agent Error:", error);
      return [];
    }
  }

  /**
   * Parfümü analiz eder
   */
  async analyzePerfume(perfumeId: string): Promise<PerfumeAnalysis | null> {
    this.checkApiKey();

    const perfume = await Product.findOne({ id: perfumeId });
    if (!perfume) return null;

    const prompt = `Sen bir parfüm uzmanısın. Aşağıdaki parfümü detaylı analiz et.

Parfüm: ${perfume.name}
Notalar: ${perfume.notes.join(", ")}
Karakteristikler: ${perfume.characteristics.join(", ")}
Cinsiyet: ${perfume.gender}
Açıklama: ${perfume.description}

Lütfen şu JSON formatında yanıt ver (sadece JSON, başka bir şey yazma):
{
  "summary": "2-3 cümlelik özet",
  "strengths": ["güçlü yön 1", "güçlü yön 2", "güçlü yön 3"],
  "idealFor": ["ideal kullanıcı tipi 1", "ideal kullanıcı tipi 2"],
  "pairingNotes": ["yakışan aksesuar/kıyafet önerisi 1", "öneri 2"]
}`;

    try {
      const response = await this.client!.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") return null;

      return JSON.parse(content.text);
    } catch (error) {
      console.error("Librarian Agent Error:", error);
      return null;
    }
  }

  /**
   * Serbest metin sorusu sor
   */
  async askAboutPerfume(question: string, perfumeId?: string): Promise<string> {
    try {
      this.checkApiKey();
    } catch (error) {
      // API key kontrolü başarısız
      throw new Error("AI_SERVICE_UNAVAILABLE");
    }

    let context = "";

    try {
      if (perfumeId) {
        const perfume = await Product.findOne({ id: perfumeId });
        if (perfume) {
          const notes = Array.isArray(perfume.notes) ? perfume.notes : [];
          const characteristics = Array.isArray(perfume.characteristics)
            ? perfume.characteristics
            : [];

          context = `
Parfüm Bilgisi:
- İsim: ${perfume.name || "Bilinmiyor"}
- Notalar: ${notes.length > 0 ? notes.join(", ") : "Belirtilmemiş"}
- Karakteristikler: ${
            characteristics.length > 0
              ? characteristics.join(", ")
              : "Belirtilmemiş"
          }
- Cinsiyet: ${perfume.gender || "unisex"}
- Fiyat: ${perfume.price || "N/A"} TL
- Açıklama: ${perfume.description || "Açıklama yok"}
`;
        }
      } else {
        // Sadece ilk 50 aktif parfümü al (token limiti için)
        const allPerfumes = await Product.find({ status: "active" })
          .limit(50)
          .select("name notes gender price")
          .lean();

        if (allPerfumes && allPerfumes.length > 0) {
          const perfumeList = allPerfumes
            .map((p) => {
              const notes = Array.isArray(p.notes) ? p.notes : [];
              const name = p.name || "İsimsiz";
              const gender = p.gender || "unisex";
              const price = p.price || "N/A";
              const noteStr =
                notes.length > 0 ? notes.slice(0, 3).join(", ") : "Nota yok";
              return `- ${name}: ${noteStr} | ${gender} | ${price} TL`;
            })
            .join("\n");

          context = `
Mevcut Parfüm Koleksiyonu (örnekler):
${perfumeList}
`;
        } else {
          context = `
Mevcut Parfüm Koleksiyonu: Şu an koleksiyonda parfüm bulunmamaktadır.
`;
        }
      }

      const prompt = `Sen Blue Perfumery'nin parfüm uzmanısın. Müşterilere yardımcı ol.
${context}

Müşteri Sorusu: ${question}

Kısa ve yardımcı bir yanıt ver (Türkçe):`;

      if (!this.client) {
        throw new Error("AI_SERVICE_UNAVAILABLE");
      }

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });

      if (!response.content || response.content.length === 0) {
        console.error("Empty response from AI");
        return "Üzgünüm, şu an yanıt veremiyorum.";
      }

      const content = response.content[0];
      if (content.type !== "text") {
        console.error("Unexpected content type:", content.type);
        return "Üzgünüm, şu an yanıt veremiyorum.";
      }

      return content.text;
    } catch (error: any) {
      console.error("Librarian Agent Error:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        type: error.type,
        stack: error.stack,
      });

      // API key hatası
      if (
        error.message === "AI_SERVICE_UNAVAILABLE" ||
        error.status === 401 ||
        error.message?.includes("authentication") ||
        error.message?.includes("API key")
      ) {
        throw new Error("AI_SERVICE_UNAVAILABLE");
      }

      // Rate limit hatası
      if (error.status === 429) {
        throw new Error("AI_SERVICE_UNAVAILABLE");
      }

      // Diğer hatalar
      throw error;
    }
  }
}

// Singleton instance
let librarianInstance: LibrarianAgent | null = null;

export function getLibrarianAgent(): LibrarianAgent {
  if (!librarianInstance) {
    librarianInstance = new LibrarianAgent();
  }
  return librarianInstance;
}

export default LibrarianAgent;
