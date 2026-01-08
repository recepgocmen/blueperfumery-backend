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
  private client: Anthropic;
  private model: string = "claude-3-haiku-20240307"; // Hızlı ve ucuz

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY bulunamadı!");
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Parfüm profilini zenginleştirir
   */
  async enrichPerfumeProfile(
    perfumeId: string
  ): Promise<EnrichedPerfumeProfile | null> {
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
      const response = await this.client.messages.create({
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
      const response = await this.client.messages.create({
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
      const response = await this.client.messages.create({
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
    let context = "";

    if (perfumeId) {
      const perfume = await Product.findOne({ id: perfumeId });
      if (perfume) {
        context = `
Parfüm Bilgisi:
- İsim: ${perfume.name}
- Notalar: ${perfume.notes.join(", ")}
- Karakteristikler: ${perfume.characteristics.join(", ")}
- Cinsiyet: ${perfume.gender}
- Fiyat: ${perfume.price} TL
- Açıklama: ${perfume.description}
`;
      }
    } else {
      const allPerfumes = await Product.find({ status: "active" });
      context = `
Mevcut Parfüm Koleksiyonu:
${allPerfumes
  .map(
    (p) =>
      `- ${p.name}: ${p.notes.slice(0, 3).join(", ")} | ${p.gender} | ${
        p.price
      } TL`
  )
  .join("\n")}
`;
    }

    const prompt = `Sen Blue Perfumery'nin parfüm uzmanısın. Müşterilere yardımcı ol.
${context}

Müşteri Sorusu: ${question}

Kısa ve yardımcı bir yanıt ver (Türkçe):`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== "text") return "Üzgünüm, şu an yanıt veremiyorum.";

      return content.text;
    } catch (error) {
      console.error("Librarian Agent Error:", error);
      return "Bir hata oluştu. Lütfen tekrar deneyin.";
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
