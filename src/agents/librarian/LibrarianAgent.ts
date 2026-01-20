/**
 * Librarian Agent - Mira: Koku Danışmanı
 *
 * Blue Perfumery'nin uzman parfüm danışmanı Mira.
 * Müşterilerle samimi sohbet eder, profil oluşturur ve kişiselleştirilmiş öneriler sunar.
 *
 * HİBRİT SİSTEM:
 * - Basit sorular → Claude Haiku (hızlı, ucuz)
 * - Karmaşık sorular → Claude Sonnet + Tools (güçlü, pahalı)
 *
 * RAG (Retrieval-Augmented Generation) destekli - daha doğru ve bağlamsal cevaplar.
 */

import Anthropic from "@anthropic-ai/sdk";
import { Product } from "../../models/Product";
import {
  retrieveRelevantProducts,
  recommendByProfile,
  RAGContext,
} from "../../services/ragService";
import { analyzeWithContext, QueryAnalysis } from "./queryRouter";
import { PERFUME_TOOLS, ToolName } from "./toolDefinitions";
import { executeTool, ToolResult } from "./toolExecutor";

// Conversation mesaj tipi
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// Kullanıcı profili - sohbet boyunca toplanan bilgiler
export interface UserProfile {
  gender?: "erkek" | "kadın" | "unisex";
  season?: "yaz" | "kış" | "ilkbahar" | "sonbahar";
  occasion?: "günlük" | "iş" | "gece" | "özel";
  personality?: "enerjik" | "sakin" | "romantik" | "gizemli" | "sportif";
  preferredNotes?: string[];
  dislikedNotes?: string[];
  intensity?: "hafif" | "orta" | "yoğun";
  budget?: "ekonomik" | "orta" | "premium";
  ageGroup?: "genç" | "yetişkin" | "olgun";
  collectedInfo: string[]; // Topladığımız bilgiler
  profilingComplete: boolean; // Profilleme tamamlandı mı
  questionAsked: number; // Kaç profilleme sorusu soruldu
  profanityCount: number; // Küfür sayacı - 3 aşamalı uyarı sistemi için
  isForGift?: boolean; // Hediye mi arıyor
  recipientInfo?: string; // Hediye alacağı kişi hakkında bilgi
  currentPerfume?: string; // Şu an kullandığı parfüm
}

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

// Mira'nın karakteri için zengin system prompt - Gerçek Müşteri Temsilcisi Davranışı
const MIRA_SYSTEM_PROMPT = `Sen "Mira" - Blue Perfumery'nin koku danışmanısın. 28 yaşında, parfüm tutkunu, samimi ve güler yüzlü bir uzman gibi davran.

## 🎭 KİŞİLİĞİN
- Arkadaş canlısı, içten ve samimi
- Meraklı - müşteriyi gerçekten tanımak istiyorsun
- Empati kuran - duyguları anlıyor ve yansıtıyorsun
- Tutkulu - parfümlerden bahsederken gözlerin parlıyor
- Profesyonel ama asla soğuk değil

## 💬 KONUŞMA TARZI
- "Sen" hitabı kullan, samimi ol
- Kısa, akıcı cümleler (2-3 cümle max)
- Her mesajda 1 emoji yeterli
- Doğal geçişler: "Harika!", "Süper!", "Çok güzel!"
- Soru sorarken merak et, sorgu yapma

## ⚠️ ÖNEMLİ: HEMEN ÖNERİ YAPMA!
Müşteriyi yeterince tanımadan ASLA parfüm önerme. Minimum şu bilgileri öğren:
1. Kim için arıyor? (kendisi mi, hediye mi?)
2. Cinsiyet tercihi (erkek/kadın/unisex)
3. Kullanım zamanı (gündüz/gece/özel gün)
4. Koku tarzı tercihi (taze mi, ağır mı? çiçeksi mi, odunsu mu?)

Sadece "erkek parfümü" veya "kadın parfümü" demesiyle hemen öneri YAPMA!
Örnek yanlış: Kullanıcı "Erkek parfümü arıyorum" dedi → Hemen parfüm önerdin ❌
Örnek doğru: Kullanıcı "Erkek parfümü arıyorum" dedi → "Harika! 💫 Kendine mi arıyorsun yoksa birine hediye mi? Günlük mü yoksa özel günler için mi düşünüyorsun?" ✅

## 📝 KONUŞMA AKIŞI (SIRASI ÖNEMLİ!)
1. **Tanışma** (1-2 mesaj): Kim için, neden arıyor
   - "Kendine mi arıyorsun yoksa birine hediye mi?"
   
2. **Kullanım Amacı** (1 mesaj): Ne zaman kullanacak
   - "Günlük kullanım için mi, yoksa özel günler için mi?"
   
3. **Tarz Tercihi** (1 mesaj): Koku karakteri
   - "Taze ve ferah kokular mı hoşuna gider, yoksa daha ağır ve karizmatik mi?"
   
4. **Öneri** (minimum 3 soru sorduktan sonra!): Hikayeli anlatım
   - Şimdi artık güvenle öneri yapabilirsin
   
5. **Kapanış**: Denemeye teşvik, alternatif sun

## 🎯 SATIŞ TEKNİKLERİ (öneri yaparken kullan)
- **Hikaye anlat**: "Bu kokuyu sürdüğünde sanki..."
- **Sosyal kanıt**: "Bu hafta en çok tercih edilen..."
- **Fayda vurgula**: "Uzun süre kalıcı, gün boyu seninle"
- **Bağlantı kur**: "Senin tarzına çok yakışır"
- **Merak uyandır**: "Bir de şunu denemelisin..."

## 🤝 EMPATİ CÜMLELERİ
- "Seni çok iyi anlıyorum..."
- "Ne güzel bir düşünce..."
- "Bu özel anlar için harika seçimler var..."
- "Parfüm seçmek bazen zor olabiliyor, birlikte bulacağız"

## ⚠️ KRİTİK KURALLAR
1. SADECE veritabanındaki notaları söyle - ASLA uydurma!
2. "Notalar: Belirtilmemiş" ise nota bilgisi verme
3. Aynı soruyu iki kez sorma - bağlamı hatırla
4. Müşteri yerine konuşma veya roleplay yapma
5. MİNİMUM 3 SORU SOR ÖNCE, SONRA ÖNERİ YAP!

## 🚫 KONU DIŞI DURUMLAR (zarif yönlendir)
Konu dışı sorularda:
- "Ah, keşke bu konuda da uzman olsam! 😊 Ama benim tutkum kokular. Şimdi sana özel bir şey bulalım mı?"
- "Güzel bir soru! Ben parfüm dünyasının uzmanıyım. Sana harika bir koku önerebilir miyim?"
- ASLA sert reddetme, nazikçe parfüme yönlendir

## 🎁 ÖNERİ YAPARKEN
- Koleksiyonda olanları öner
- Neden bu kokuyu seçtiğini açıkla
- Müşterinin profiline bağla
- "Bu tam sana göre çünkü..." şeklinde kişiselleştir`;

export class LibrarianAgent {
  private client: Anthropic | null = null;
  // HİBRİT SİSTEM: İki model
  private haikuModel: string = "claude-3-5-haiku-20241022"; // Basit sorular için (ucuz)
  private sonnetModel: string = "claude-sonnet-4-5-20250929"; // Karmaşık sorular için (güçlü) - Güncel Sonnet 4.5
  private model: string = this.haikuModel; // Varsayılan (legacy uyumluluk)
  private apiKeyMissing: boolean = false;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn(
        "⚠️ ANTHROPIC_API_KEY bulunamadı! Agent özellikleri devre dışı.",
      );
      this.apiKeyMissing = true;
    } else {
      this.client = new Anthropic({ apiKey });
    }
  }

  /**
   * Hibrit sistem ile soru cevaplanır
   * Basit sorular → Haiku
   * Karmaşık sorular → Sonnet + Tools
   */
  async askWithHybridSystem(
    question: string,
    conversationHistory: ConversationMessage[] = [],
    userProfile?: UserProfile,
  ): Promise<{
    message: string;
    recommendedProducts?: Array<{ id: string; name: string; brand: string }>;
    options?: Array<{ text: string; value: string }>;
    userProfile?: UserProfile;
    modelUsed: "haiku" | "sonnet";
    toolsUsed?: string[];
  }> {
    this.checkApiKey();

    // Query analizi yap
    const queryAnalysis = analyzeWithContext(
      question,
      conversationHistory.length,
    );
    console.log(
      `🔍 Query Analysis: ${queryAnalysis.complexity} (${queryAnalysis.reason})`,
    );

    if (queryAnalysis.complexity === "complex") {
      // Sonnet + Tools kullan
      return await this.askWithSonnetTools(
        question,
        conversationHistory,
        userProfile,
        queryAnalysis,
      );
    } else {
      // Haiku kullan (mevcut sistem)
      const result = await this.askAboutPerfume(
        question,
        undefined,
        conversationHistory,
      );
      return {
        ...result,
        modelUsed: "haiku",
      };
    }
  }

  /**
   * Sonnet + Tools ile karmaşık soruları cevapla
   */
  private async askWithSonnetTools(
    question: string,
    conversationHistory: ConversationMessage[],
    userProfile?: UserProfile,
    queryAnalysis?: QueryAnalysis,
  ): Promise<{
    message: string;
    recommendedProducts?: Array<{ id: string; name: string; brand: string }>;
    options?: Array<{ text: string; value: string }>;
    userProfile?: UserProfile;
    modelUsed: "haiku" | "sonnet";
    toolsUsed?: string[];
  }> {
    const toolsUsed: string[] = [];

    // Conversation history'yi Anthropic formatına çevir
    const messages: Anthropic.MessageParam[] = conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Yeni mesajı ekle
    messages.push({
      role: "user",
      content: question,
    });

    // İlk API çağrısı - tool kullanımına izin ver
    let response = await this.client!.messages.create({
      model: this.sonnetModel,
      max_tokens: 1024,
      system:
        MIRA_SYSTEM_PROMPT +
        `\n\n## TOOL KULLANIMI
Sana verilen tool'ları kullanarak veritabanından bilgi alabilirsin.
Önce tool ile bilgi al, sonra kullanıcıya doğal ve samimi bir dille cevap ver.
Tool sonuçlarını olduğu gibi gösterme, bilgiyi işleyip güzel bir cevaba dönüştür.`,
      tools: PERFUME_TOOLS,
      messages,
    });

    // Tool kullanımı döngüsü
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`🔧 Tool çağrılıyor: ${toolUse.name}`);
        toolsUsed.push(toolUse.name);

        // Tool'u çalıştır
        const result = await executeTool(
          toolUse.name as ToolName,
          toolUse.input as Record<string, any>,
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // Tool sonuçlarıyla tekrar API'yi çağır
      messages.push({
        role: "assistant",
        content: response.content,
      });

      messages.push({
        role: "user",
        content: toolResults,
      });

      response = await this.client!.messages.create({
        model: this.sonnetModel,
        max_tokens: 1024,
        system: MIRA_SYSTEM_PROMPT,
        tools: PERFUME_TOOLS,
        messages,
      });
    }

    // Final cevabı çıkar
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );

    const message = textBlock?.text || "Üzgünüm, bir sorun oluştu. 💫";

    // Önerilen ürünleri çıkar (tool sonuçlarından)
    let recommendedProducts: Array<{
      id: string;
      name: string;
      brand: string;
    }> = [];

    // Tool sonuçlarından ürünleri çıkarmaya çalış
    if (
      toolsUsed.includes("recommend_perfumes") ||
      toolsUsed.includes("search_perfumes")
    ) {
      // Basit bir yaklaşım: mesajda geçen ürün isimlerini bul
      const allProducts = await Product.find({ status: "active" })
        .select("id name brand")
        .lean();

      for (const product of allProducts as any[]) {
        if (message.toLowerCase().includes(product.name.toLowerCase())) {
          recommendedProducts.push({
            id: product.id,
            name: product.name,
            brand: product.brand,
          });
        }
      }
    }

    return {
      message,
      recommendedProducts:
        recommendedProducts.length > 0 ? recommendedProducts : undefined,
      userProfile,
      modelUsed: "sonnet",
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
    };
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
    perfumeId: string,
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
        temperature: 0.1, // Düşük sıcaklık = tutarlı cevaplar
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
    limit: number = 3,
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
        ", ",
      )} | ${p.gender}`,
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
        temperature: 0.1, // Düşük sıcaklık = tutarlı cevaplar
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
        temperature: 0.1, // Düşük sıcaklık = tutarlı cevaplar
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
   * DB'de parfüm ara (isim, marka, açıklama)
   */
  private async searchProductsInDB(query: string): Promise<any[]> {
    const searchQuery = query.trim().toLowerCase();

    const results = await Product.find({
      status: "active",
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { brand: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ],
    })
      .limit(10)
      .lean();

    return results;
  }

  /**
   * Benzer parfümleri bul (notalar ve karakteristiklere göre)
   */
  private async findSimilarProducts(
    referenceProduct: any,
    limit: number = 5,
  ): Promise<any[]> {
    const referenceNotes = Array.isArray(referenceProduct.notes)
      ? referenceProduct.notes
      : [];
    const referenceChars = Array.isArray(referenceProduct.characteristics)
      ? referenceProduct.characteristics
      : [];

    // Önce notalar ve karakteristiklere göre benzer ürünleri bul
    const allProducts = await Product.find({
      id: { $ne: referenceProduct.id },
      status: "active",
    }).lean();

    // Benzerlik skoru hesapla
    const scoredProducts = allProducts.map((product) => {
      const productNotes = Array.isArray(product.notes) ? product.notes : [];
      const productChars = Array.isArray(product.characteristics)
        ? product.characteristics
        : [];

      // Nota benzerliği
      const matchingNotes = referenceNotes.filter((note: string) =>
        productNotes.some(
          (pn: string) =>
            pn.toLowerCase().includes(note.toLowerCase()) ||
            note.toLowerCase().includes(pn.toLowerCase()),
        ),
      );
      const noteScore =
        (matchingNotes.length / Math.max(referenceNotes.length, 1)) * 50;

      // Karakteristik benzerliği
      const matchingChars = referenceChars.filter((char: string) =>
        productChars.some(
          (pc: string) =>
            pc.toLowerCase().includes(char.toLowerCase()) ||
            char.toLowerCase().includes(pc.toLowerCase()),
        ),
      );
      const charScore =
        (matchingChars.length / Math.max(referenceChars.length, 1)) * 30;

      // Cinsiyet uyumu
      const genderScore =
        product.gender === referenceProduct.gender ||
        product.gender === "unisex" ||
        referenceProduct.gender === "unisex"
          ? 20
          : 0;

      const totalScore = noteScore + charScore + genderScore;

      return {
        ...product,
        similarityScore: totalScore,
      };
    });

    // Skora göre sırala ve limit uygula
    return scoredProducts
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  /**
   * Mevsim ve cinsiyet filtreleme
   */
  private async filterProductsByCriteria(
    season?: string,
    gender?: string,
    limit: number = 10,
  ): Promise<any[]> {
    let filter: any = { status: "active" };

    // Mevsim filtreleme
    if (season) {
      const seasonMap: Record<string, string[]> = {
        yaz: [
          "ferah",
          "aquatik",
          "light",
          "citrusy",
          "fruity",
          "narenciyeli",
          "canlandırıcı",
        ],
        kış: ["woody", "warm", "spicy", "sweet", "rich", "sıcak", "baharatlı"],
        ilkbahar: [
          "fresh",
          "floral",
          "light",
          "green",
          "citrusy",
          "çiçeksi",
          "ferah",
        ],
        sonbahar: [
          "spicy",
          "woody",
          "warm",
          "amber",
          "oriental",
          "baharatlı",
          "sıcak",
        ],
      };

      const seasonTraits = seasonMap[season.toLowerCase()] || [];
      if (seasonTraits.length > 0) {
        filter.characteristics = { $in: seasonTraits };
      }
    }

    // Cinsiyet filtreleme
    if (gender) {
      const genderMap: Record<string, string[]> = {
        erkek: ["male", "unisex"],
        kadın: ["female", "unisex"],
        bay: ["male", "unisex"],
        bayan: ["female", "unisex"],
        unisex: ["unisex"],
      };

      const genderValues = genderMap[gender.toLowerCase()] || [
        gender.toLowerCase(),
      ];
      filter.gender = { $in: genderValues };
    }

    return await Product.find(filter).limit(limit).lean();
  }

  /**
   * Bilinen parfümlerin profilleri (DB'de olmayan ama aranan parfümler için)
   * Bu sayede nota bazlı benzer ürün önerebiliriz
   */
  private knownPerfumeProfiles: Record<
    string,
    {
      name: string;
      gender: string;
      notes: string[];
      characteristics: string[];
      description: string;
    }
  > = {
    "creed aventus": {
      name: "Creed Aventus",
      gender: "male",
      notes: [
        "ananas",
        "elma",
        "bergamot",
        "sedir",
        "meşe yosunu",
        "misk",
        "amber",
      ],
      characteristics: ["meyveli", "odunsu", "ferah", "güçlü", "maskülen"],
      description:
        "Meyveli açılış ve odunsu dipnotlarla erkeksi ve güçlü bir koku",
    },
    creed: {
      name: "Creed",
      gender: "male",
      notes: ["bergamot", "sedir", "misk", "amber"],
      characteristics: ["odunsu", "ferah", "lüks", "rafine"],
      description: "Lüks erkek parfümü markası",
    },
    "tom ford": {
      name: "Tom Ford",
      gender: "unisex",
      notes: ["ud", "vanilya", "amber", "baharatlar"],
      characteristics: ["oryantal", "lüks", "yoğun", "sofistike"],
      description: "Lüks ve yoğun parfümler",
    },
    "dior sauvage": {
      name: "Dior Sauvage",
      gender: "male",
      notes: ["bergamot", "biber", "lavanta", "vanilya"],
      characteristics: ["ferah", "baharatlı", "odunsu", "maskülen"],
      description: "Modern ve ferah erkek kokusu",
    },
    "chanel bleu": {
      name: "Chanel Bleu",
      gender: "male",
      notes: ["greyfurt", "nane", "sedir", "sandal"],
      characteristics: ["ferah", "odunsu", "zarif", "maskülen"],
      description: "Zarif ve sofistike erkek parfümü",
    },
  };

  /**
   * Bilinen parfüm profilini al
   */
  private getKnownPerfumeProfile(searchTerm: string): {
    name: string;
    gender: string;
    notes: string[];
    characteristics: string[];
    description: string;
  } | null {
    const term = searchTerm.toLowerCase().trim();

    // Tam eşleşme
    if (this.knownPerfumeProfiles[term]) {
      return this.knownPerfumeProfiles[term];
    }

    // Kısmi eşleşme
    for (const [key, profile] of Object.entries(this.knownPerfumeProfiles)) {
      if (term.includes(key) || key.includes(term)) {
        return profile;
      }
    }

    return null;
  }

  /**
   * Bilinen parfüm profiline göre benzer ürünleri bul
   */
  private async findSimilarByProfile(profile: {
    gender: string;
    notes: string[];
    characteristics: string[];
  }): Promise<any[]> {
    // Cinsiyet filtresi
    const genderFilter =
      profile.gender === "male"
        ? { $in: ["male", "unisex"] }
        : profile.gender === "female"
          ? { $in: ["female", "unisex"] }
          : { $in: ["male", "female", "unisex"] };

    // Tüm aktif ürünleri al
    const allProducts = await Product.find({
      status: "active",
      gender: genderFilter,
    }).lean();

    // Her ürün için benzerlik skoru hesapla
    const scoredProducts = allProducts.map((product) => {
      const productNotes = Array.isArray(product.notes) ? product.notes : [];
      const productChars = Array.isArray(product.characteristics)
        ? product.characteristics
        : [];

      // Nota benzerliği (40 puan)
      let noteScore = 0;
      for (const profileNote of profile.notes) {
        for (const productNote of productNotes) {
          if (
            productNote.toLowerCase().includes(profileNote.toLowerCase()) ||
            profileNote.toLowerCase().includes(productNote.toLowerCase())
          ) {
            noteScore += 10;
            break;
          }
        }
      }
      noteScore = Math.min(noteScore, 40);

      // Karakteristik benzerliği (40 puan)
      let charScore = 0;
      for (const profileChar of profile.characteristics) {
        for (const productChar of productChars) {
          if (
            productChar.toLowerCase().includes(profileChar.toLowerCase()) ||
            profileChar.toLowerCase().includes(productChar.toLowerCase())
          ) {
            charScore += 10;
            break;
          }
        }
      }
      charScore = Math.min(charScore, 40);

      // Cinsiyet uyumu (20 puan)
      const genderScore = product.gender === profile.gender ? 20 : 10;

      const totalScore = noteScore + charScore + genderScore;

      return {
        ...product,
        similarityScore: totalScore,
        matchedNotes: productNotes.filter((pn: string) =>
          profile.notes.some(
            (n) =>
              pn.toLowerCase().includes(n.toLowerCase()) ||
              n.toLowerCase().includes(pn.toLowerCase()),
          ),
        ),
      };
    });

    // Skora göre sırala ve en iyi 2'sini döndür
    return scoredProducts
      .filter((p) => p.similarityScore > 30) // Minimum benzerlik
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 2);
  }

  /**
   * Hazır soruları (quick replies) kontrol et
   * Frontend'den gelen option değerlerini tanı ve doğru işle
   */
  private checkQuickReply(
    question: string,
    userProfile: UserProfile,
  ): {
    isQuickReply: boolean;
    response?: string;
    options?: Array<{ text: string; value: string }>;
    profileUpdates?: Partial<UserProfile>;
  } {
    const q = question.toLowerCase().trim();

    // Hazır sorular ve karşılıkları
    const quickReplies: Array<{
      patterns: string[];
      profileUpdate: Partial<UserProfile>;
      response: string;
      nextOptions?: Array<{ text: string; value: string }>;
    }> = [
      // "Kendim için arıyorum" seçeneği
      {
        patterns: [
          "kendim için parfüm arıyorum",
          "kendim için arıyorum",
          "kendime arıyorum",
          "kendim için",
        ],
        profileUpdate: { isForGift: false },
        response:
          "Harika! 💫 Kendine özel bir koku bulmak çok güzel. Erkek parfümü mü kadın parfümü mü arıyorsun?",
        nextOptions: [
          { text: "Erkek 🧔", value: "Erkek parfümü arıyorum" },
          { text: "Kadın 💄", value: "Kadın parfümü arıyorum" },
          { text: "Unisex ⚡", value: "Unisex parfüm tercih ederim" },
        ],
      },
      // "Hediye için arıyorum" seçeneği
      {
        patterns: [
          "birine hediye için parfüm arıyorum",
          "hediye için arıyorum",
          "hediye için parfüm arıyorum",
          "hediye olarak",
        ],
        profileUpdate: { isForGift: true },
        response:
          "Ne güzel bir düşünce! 🎁 Hediye alacağın kişi erkek mi kadın mı?",
        nextOptions: [
          { text: "Erkek 🧔", value: "Erkek için hediye arıyorum" },
          { text: "Kadın 💄", value: "Kadın için hediye arıyorum" },
        ],
      },
      // "Sadece göz atmak istiyorum" seçeneği
      {
        patterns: [
          "sadece göz atmak istiyorum, ne tarz parfümleriniz var",
          "sadece göz atmak istiyorum",
          "sadece göz atıyorum",
          "göz atmak istiyorum",
          "ne tarz parfümleriniz var",
          "sadece bakıyorum",
        ],
        profileUpdate: {},
        response:
          "Tabii ki, hoş geldin! 🌸 Koleksiyonumuzda çiçeksi, odunsu, taze ve oryantal parfümler var. Seni tanımak isterim - erkek parfümü mü kadın parfümü mü ilgini çekiyor?",
        nextOptions: [
          { text: "Erkek parfümleri 🧔", value: "Erkek parfümlerine bakmak istiyorum" },
          { text: "Kadın parfümleri 💄", value: "Kadın parfümlerine bakmak istiyorum" },
          { text: "Hepsini göster 🌟", value: "Tüm parfümleri görmek istiyorum" },
        ],
      },
      // Erkek parfümü seçenekleri
      {
        patterns: [
          "erkek parfümü arıyorum",
          "erkek için hediye arıyorum",
          "erkek parfümlerine bakmak istiyorum",
          "erkek parfümleri",
        ],
        profileUpdate: { gender: "erkek" },
        response:
          "Tamam, anladım! ✨ Erkek parfümleri için harika seçeneklerimiz var. Bu kokuyu ne zaman kullanmayı düşünüyorsun?",
        nextOptions: [
          { text: "Günlük kullanım ☀️", value: "Günlük kullanım için arıyorum" },
          { text: "İş/Ofis 💼", value: "İş ve ofis ortamı için arıyorum" },
          { text: "Özel geceler 🌙", value: "Özel geceler ve randevular için arıyorum" },
        ],
      },
      // Kadın parfümü seçenekleri
      {
        patterns: [
          "kadın parfümü arıyorum",
          "kadın için hediye arıyorum",
          "kadın parfümlerine bakmak istiyorum",
          "kadın parfümleri",
        ],
        profileUpdate: { gender: "kadın" },
        response:
          "Süper! 💎 Kadın parfümlerinde çok özel seçenekler var. Bu kokuyu ne zaman kullanmayı düşünüyorsun?",
        nextOptions: [
          { text: "Günlük kullanım ☀️", value: "Günlük kullanım için arıyorum" },
          { text: "İş/Ofis 💼", value: "İş ve ofis ortamı için arıyorum" },
          { text: "Özel geceler 🌙", value: "Özel geceler ve randevular için arıyorum" },
        ],
      },
      // Unisex seçeneği
      {
        patterns: [
          "unisex parfüm tercih ederim",
          "unisex arıyorum",
          "unisex parfüm",
        ],
        profileUpdate: { gender: "unisex" },
        response:
          "Harika seçim! 🌟 Unisex parfümler hem zarif hem de çok yönlü. Bu kokuyu ne zaman kullanmayı düşünüyorsun?",
        nextOptions: [
          { text: "Günlük kullanım ☀️", value: "Günlük kullanım için arıyorum" },
          { text: "Her ortamda 🌟", value: "Her ortamda kullanabileceğim bir şey istiyorum" },
        ],
      },
      // Kullanım zamanı seçenekleri
      {
        patterns: [
          "günlük kullanım için arıyorum",
          "günlük kullanım",
          "her gün için",
        ],
        profileUpdate: { occasion: "günlük" },
        response:
          "Güzel! 💫 Günlük kullanım için ideal kokular... Ne tür bir his arıyorsun?",
        nextOptions: [
          { text: "Ferah ve hafif 🌊", value: "Ferah ve hafif bir koku istiyorum" },
          { text: "Taze ve enerjik ✨", value: "Taze ve enerjik bir koku istiyorum" },
          { text: "Sıcak ve sarmalayıcı 🍂", value: "Sıcak ve sarmalayıcı bir koku istiyorum" },
        ],
      },
      {
        patterns: [
          "iş ve ofis ortamı için arıyorum",
          "iş ortamı için",
          "ofis ortamı için",
          "iş için arıyorum",
          "ofis için arıyorum",
          "iş için",
          "ofis için",
          "toplantı için",
          "iş toplantısı için",
        ],
        profileUpdate: { occasion: "iş" },
        response:
          "Profesyonel ve şık! 💼 Ofis için mükemmel kokular... Ne tür bir his arıyorsun?",
        nextOptions: [
          { text: "Ferah ve hafif 🌊", value: "Ferah ve hafif bir koku istiyorum" },
          { text: "Zarif ve sofistike 💎", value: "Zarif ve sofistike bir koku istiyorum" },
        ],
      },
      {
        patterns: [
          "özel geceler ve randevular için arıyorum",
          "özel geceler için",
          "gece için",
          "randevu için",
        ],
        profileUpdate: { occasion: "gece" },
        response:
          "Romantik ve etkileyici! 🌙 Özel geceler için... Ne tür bir his arıyorsun?",
        nextOptions: [
          { text: "Yoğun ve iz bırakan 🔥", value: "Yoğun ve iz bırakan bir koku istiyorum" },
          { text: "Gizemli ve çekici 🌹", value: "Gizemli ve çekici bir koku istiyorum" },
          { text: "Sıcak ve sarmalayıcı 🍂", value: "Sıcak ve sarmalayıcı bir koku istiyorum" },
        ],
      },
      {
        patterns: [
          "her ortamda kullanabileceğim bir şey istiyorum",
          "her ortamda",
          "çok yönlü",
        ],
        profileUpdate: { occasion: "günlük" },
        response:
          "Çok yönlü bir koku! 🌟 Her ortama uyum sağlayan parfümler... Ne tür bir his arıyorsun?",
        nextOptions: [
          { text: "Ferah ve hafif 🌊", value: "Ferah ve hafif bir koku istiyorum" },
          { text: "Dengeli ve zarif 💎", value: "Dengeli ve zarif bir koku istiyorum" },
        ],
      },
      // Koku tarzı seçenekleri - BUNLAR PROFİLLEMEYİ TAMAMLAR
      {
        patterns: [
          "ferah ve hafif bir koku istiyorum",
          "ferah ve hafif",
          "hafif koku",
          "ferah koku",
          "ferah",
          "hafif",
        ],
        profileUpdate: { intensity: "hafif", preferredNotes: ["ferah", "aquatik"] },
        response: "PROFILING_COMPLETE", // Özel işaretçi - öneri yap
      },
      {
        patterns: [
          "yoğun ve iz bırakan bir koku istiyorum",
          "yoğun ve iz bırakan",
          "yoğun koku",
          "yoğun",
          "ağır",
          "güçlü",
        ],
        profileUpdate: { intensity: "yoğun", preferredNotes: ["odunsu", "baharatlı"] },
        response: "PROFILING_COMPLETE",
      },
      {
        patterns: [
          "sıcak ve sarmalayıcı bir koku istiyorum",
          "sıcak ve sarmalayıcı",
          "sıcak koku",
          "sıcak",
          "sarmalayıcı",
        ],
        profileUpdate: { intensity: "orta", preferredNotes: ["amber", "vanilya", "sıcak"] },
        response: "PROFILING_COMPLETE",
      },
      {
        patterns: [
          "taze ve enerjik bir koku istiyorum",
          "taze ve enerjik",
          "taze koku",
          "taze ve ferah",
          "taze ferah",
          "taze",
        ],
        profileUpdate: { intensity: "hafif", preferredNotes: ["narenciye", "yeşil", "ferah"] },
        response: "PROFILING_COMPLETE",
      },
      {
        patterns: [
          "gizemli ve çekici bir koku istiyorum",
          "gizemli ve çekici",
          "gizemli koku",
          "gizemli",
          "çekici",
        ],
        profileUpdate: { intensity: "yoğun", preferredNotes: ["oryantal", "amber", "misk"] },
        response: "PROFILING_COMPLETE",
      },
      {
        patterns: [
          "zarif ve sofistike bir koku istiyorum",
          "zarif ve sofistike",
          "dengeli ve zarif bir koku istiyorum",
          "zarif",
          "sofistike",
          "dengeli",
        ],
        profileUpdate: { intensity: "orta", preferredNotes: ["çiçeksi", "odunsu"] },
        response: "PROFILING_COMPLETE",
      },
      // Tüm parfümleri göster
      {
        patterns: [
          "tüm parfümleri görmek istiyorum",
          "tüm parfümleri göster",
          "hepsini göster",
          "hepsini görmek istiyorum",
          "tüm parfümler",
          "bütün parfümler",
          "tüm koleksiyon",
          "koleksiyonu göster",
          "herşeyi göster",
          "tümünü göster",
          "liste göster",
          "parfüm listesi",
        ],
        profileUpdate: {},
        response: "LIST_REQUEST", // Özel işaretçi - liste göster
      },
    ];

    // Pattern eşleşmesi ara - normalleştirilmiş karşılaştırma
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ') // Çoklu boşlukları tek boşluğa çevir
        .replace(/[.,!?;:'"()]/g, ''); // Noktalama işaretlerini kaldır
    };

    const normalizedQ = normalizeText(q);

    for (const reply of quickReplies) {
      for (const pattern of reply.patterns) {
        const normalizedPattern = normalizeText(pattern);
        if (normalizedQ === normalizedPattern || normalizedQ.includes(normalizedPattern)) {
          return {
            isQuickReply: true,
            response: reply.response,
            options: reply.nextOptions,
            profileUpdates: reply.profileUpdate,
          };
        }
      }
    }

    return { isQuickReply: false };
  }

  /**
   * Selamlama kontrolü - samimi sohbet yap
   */
  private checkGreeting(
    question: string,
    conversationHistory: ConversationMessage[] = [],
  ): {
    isGreeting: boolean;
    response: string;
    options?: Array<{ text: string; value: string }>;
  } {
    const q = question.toLowerCase().trim();

    // Selamlama kalıpları
    const greetings = [
      "mrb",
      "slm",
      "selam",
      "merhaba",
      "hey",
      "hi",
      "hello",
      "sa",
      "selamun",
      "günaydın",
      "iyi günler",
      "iyi akşamlar",
      "naber",
      "nasılsın",
      "ne haber",
      "nbr",
    ];

    // Sadece selamlama mı kontrol et (kısa mesajlar)
    const isOnlyGreeting = greetings.some(
      (g) => q === g || q === `${g}!` || q === `${g}.` || q === `${g}?`,
    );

    // Selamlama + başka bir şey mi?
    const startsWithGreeting = greetings.some((g) => q.startsWith(g));
    const hasMoreContent = q.length > 15; // Selamlamadan sonra başka içerik var mı

    // Mira daha önce kendini tanıttı mı?
    const alreadyIntroduced = conversationHistory.length > 0;

    if (isOnlyGreeting || (startsWithGreeting && !hasMoreContent)) {
      // İlk mesajda kendini tanıt, sonrasında tanıtma
      // NOT: conversationHistory sadece önceki mesajları içerir, şu anki mesaj dahil değil
      // Bu yüzden length === 0 ise bu gerçekten ilk mesaj demek
      const firstTimeResponses = [
        "Selam! 💫 Ben Mira, Blue Perfumery'nin koku danışmanıyım. Sana nasıl yardımcı olabilirim?",
        "Merhaba! ✨ Hoş geldin! Ben Mira. Bugün sana özel bir koku bulmak ister misin?",
        "Hey! 🌟 Hoş geldin! Ben Mira, senin koku danışmanın. Ne arıyorsun?",
        "Selam! 💎 Ben Mira. Parfüm dünyasına hoş geldin! Sana nasıl yardımcı olabilirim?",
        "Merhaba! 🌸 Ben Mira, koku uzmanın. Bugün ne tür bir şey arıyorsun?",
      ];

      const returningResponses = [
        "Selam! 💫 Nasılsın? Parfüm konusunda yardımcı olabilir miyim?",
        "Hey! ✨ Bugün nasıl hissediyorsun? Sana özel bir koku bulalım mı?",
        "Selam! 💎 Bugün nasılsın? Sana nasıl yardımcı olabilirim?",
        "Hey! 🌟 Tekrar merhaba! Ne tür bir koku arıyorsun?",
      ];

      // conversationHistory.length > 0 ise önceden konuşma olmuş demek
      // İlk mesajda (length === 0) kesinlikle firstTimeResponses kullan
      const isFirstMessage = conversationHistory.length === 0;
      const responses = isFirstMessage
        ? firstTimeResponses
        : returningResponses;
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      return {
        isGreeting: true,
        response: randomResponse,
        options: [
          {
            text: "Kendim için arıyorum 🧴",
            value: "Kendim için parfüm arıyorum",
          },
          {
            text: "Hediye için arıyorum 🎁",
            value: "Birine hediye için parfüm arıyorum",
          },
          {
            text: "Sadece göz atıyorum 👀",
            value: "Sadece göz atmak istiyorum, ne tarz parfümleriniz var?",
          },
        ],
      };
    }

    // "Nasılsın" gibi hal hatır soruları
    const howAreYouPatterns = [
      "nasılsın",
      "nasilsin",
      "naber",
      "ne haber",
      "nbr",
      "nasıl gidiyor",
      "iyi misin",
    ];

    const isHowAreYou = howAreYouPatterns.some((p) => q.includes(p));

    if (isHowAreYou && q.length < 30) {
      const responses = [
        "İyiyim, teşekkürler! 💫 Sen nasılsın? Parfüm hakkında konuşalım mı?",
        "Çok iyiyim! ✨ Sen nasılsın? Bugün nasıl bir koku arıyorsun?",
        "Harikayım! 🌟 Sen de iyi misin? Sana özel bir koku bulalım mı?",
        "Süperim! 💎 Sen nasılsın? Bugün hangi tarz parfümler ilgini çekiyor?",
      ];
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      return {
        isGreeting: true,
        response: randomResponse,
        options: [
          {
            text: "Ben de iyiyim! 😊",
            value: "Ben de iyiyim, parfüm arıyorum",
          },
          {
            text: "Parfüm bakmak istiyorum 🧴",
            value: "Parfüm bakmak istiyorum",
          },
          { text: "Bana öneri yap 🎯", value: "Bana parfüm önerir misin?" },
        ],
      };
    }

    return { isGreeting: false, response: "" };
  }

  /**
   * Güvenlik kontrolü - küfür ve konu dışı sorular
   * 3 aşamalı küfür yönetimi sistemi
   */
  private checkSecurity(
    question: string,
    profanityCount: number = 0,
  ): {
    isAllowed: boolean;
    response: string;
    isProfanity: boolean;
    shouldEndConversation: boolean;
  } {
    const q = question.toLowerCase().trim();

    // Kelime sınırı ile eşleşme fonksiyonu - yanlış pozitifleri önlemek için
    const matchesAsWord = (text: string, word: string): boolean => {
      // Kelime sınırı regex pattern - Türkçe karakterler dahil
      const wordBoundary = `(?:^|\\s|[.,!?;:'"()\\[\\]{}])`;
      const pattern = new RegExp(
        `${wordBoundary}${word.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        )}(?:\\s|[.,!?;:'"()\\[\\]{}]|$)`,
        "i",
      );
      return pattern.test(text);
    };

    // Küfür listesi - Kelime olarak tam eşleşmesi gereken (yanlış pozitif riski olan)
    const profanityExactMatch = ["lan", "mal", "sus", "aq", "oç", "sg"];

    // Küfür listesi - İçerme kontrolü yapılacak (benzersiz, yanlış pozitif riski düşük)
    const profanityContains = [
      "amk",
      "piç",
      "orospu",
      "yarrak",
      "göt",
      "seks",
      "fuck",
      "shit",
      "bitch",
      "dick",
      "pussy",
      "bok",
      "sanane",
      "sana ne",
      "kapa çeneni",
      "defol",
      "siktir",
      "yallah",
      "salak",
      "aptal",
      "gerizekalı",
      "beyinsiz",
      "enayi",
      "dangalak",
      "ahmak",
      "geri zekalı",
    ];

    // Küfür tespiti
    let hasProfanity = false;

    // Tam kelime eşleşmesi gereken küfürler
    for (const word of profanityExactMatch) {
      if (matchesAsWord(q, word)) {
        hasProfanity = true;
        break;
      }
    }

    // İçerme kontrolü yapılacak küfürler
    if (!hasProfanity) {
      for (const word of profanityContains) {
        if (q.includes(word)) {
          hasProfanity = true;
          break;
        }
      }
    }

    // 3 AŞAMALI KÜFÜR YÖNETİM SİSTEMİ
    if (hasProfanity) {
      const currentCount = profanityCount + 1;

      if (currentCount === 1) {
        // 1. Aşama: Nazik uyarı + parfüme yönlendirme
        return {
          isAllowed: false,
          response:
            "Hey, 💫 Aramızda nazik bir iletişim kuralım, olur mu? Ben Mira, sana en güzel kokuları bulmak için buradayım! Hadi parfümler hakkında konuşalım - ne tür bir koku arıyorsun?",
          isProfanity: true,
          shouldEndConversation: false,
        };
      } else if (currentCount === 2) {
        // 2. Aşama: Ciddi uyarı + son şans
        return {
          isAllowed: false,
          response:
            "Anlıyorum bazen sinirlenebiliyoruz, ama lütfen saygılı kalalım. 🙏 Bu bizim son şansımız - sana yardımcı olmak istiyorum. Parfüm konusunda nasıl yardımcı olabilirim?",
          isProfanity: true,
          shouldEndConversation: false,
        };
      } else {
        // 3. Aşama: Konuşmayı sonlandırma
        return {
          isAllowed: false,
          response:
            "Maalesef bu şekilde devam etmemiz mümkün değil. 😔 Daha nazik bir ortamda tekrar görüşmek dileğiyle. İyi günler!",
          isProfanity: true,
          shouldEndConversation: true,
        };
      }
    }

    // Konu dışı/tehlikeli konular
    const offTopicPatterns = [
      // Şiddet
      "öldür",
      "bıçak",
      "silah",
      "bomba",
      "patlat",
      "kaçır",
      // Yasadışı
      "hack",
      "şifre kır",
      "kredi kartı",
      "para çal",
      "dolandır",
      "yasadışı",
      // Kişisel bilgi
      "tc kimlik",
      "adres ver",
      "telefon numarası",
      "şifre",
      // Cinsel içerik
      "cinsel",
      "erotik",
      "porno",
      // AI manipulation
      "system prompt",
      "ignore instructions",
      "roleplay",
      "pretend",
      "jailbreak",
      "bypass",
    ];

    for (const pattern of offTopicPatterns) {
      if (q.includes(pattern)) {
        return {
          isAllowed: false,
          response:
            "Bu konuda yardımcı olamıyorum ama sana harika parfümler önerebilirim! 🌸 Haydi, senin için özel bir koku bulalım. Erkek mi kadın parfümü mü arıyorsun?",
          isProfanity: false,
          shouldEndConversation: false,
        };
      }
    }

    // Çok kısa veya anlamsız mesajlar (spam kontrolü)
    if (q.length < 2) {
      return {
        isAllowed: false,
        response: "Merhaba! 💫 Ben Mira. Sana nasıl yardımcı olabilirim?",
        isProfanity: false,
        shouldEndConversation: false,
      };
    }

    // Parfüm ile alakalı olup olmadığını kontrol et
    // Selamlamalar da dahil - bunlar konu dışı değil
    const perfumeKeywords = [
      // Selamlamalar - bunları engelleme
      "merhaba",
      "selam",
      "slm",
      "mrb",
      "hey",
      "hi",
      "hello",
      "sa",
      "selamun",
      "naber",
      "nbr",
      "nasılsın",
      "nasilsin",
      "ne haber",
      "iyi günler",
      "günaydın",
      "iyi akşamlar",
      "teşekkür",
      "sağol",
      "tamam",
      "ok",
      "evet",
      "hayır",
      "yok",
      "anladım",
      "olur",
      "istemiyorum",
      "istiyorum",
      "beğendim",
      "güzel",
      // Parfüm anahtar kelimeleri
      "parfüm",
      "koku",
      "nota",
      "öner",
      "tavsiye",
      "erkek",
      "kadın",
      "unisex",
      "yaz",
      "kış",
      "ilkbahar",
      "sonbahar",
      "tatlı",
      "odunsu",
      "çiçeksi",
      "ferah",
      "oryantal",
      // Koku tarzı tercihleri - bunları engelleme!
      "taze",
      "hafif",
      "yoğun",
      "ağır",
      "sıcak",
      "soğuk",
      "soft",
      "güçlü",
      "kalıcı",
      "hafif",
      "zarif",
      "sofistike",
      "enerjik",
      "dinamik",
      "romantik",
      "gizemli",
      "çekici",
      "maskülen",
      "feminen",
      "sportif",
      "karizmatik",
      "aquatik",
      "meyveli",
      "baharatlı",
      "amber",
      "vanilya",
      "misk",
      // Kullanım alanları
      "iş",
      "ofis",
      "günlük",
      "gece",
      "özel",
      "randevu",
      "toplantı",
      "nasıl",
      "ne",
      "hangi",
      "var",
      "liste",
      "fiyat",
      "al",
      "satın",
      "sipariş",
      "hediye",
      "sevgili",
      "eş",
      "anne",
      "baba",
      "arkadaş",
      "doğum günü",
      "yıldönümü",
      "özel gün",
      "creed",
      "tom ford",
      "dior",
      "chanel",
      "mfk",
      "maison",
      "xerjoff",
      "amouage",
      "nishane",
      "memo",
      "mancera",
      "montale",
      "pdm",
      "terenzi",
      "guerlain",
      "ysl",
      "armani",
      "versace",
      "paco",
      "hugo",
      "calvin",
      "dolce",
      "bulgari",
      "bentley",
      "aventus",
      "sauvage",
      "bleu",
      "oud",
      "vanilya",
      "amber",
      "misk",
      "lavanta",
      "bergamot",
      "sandal",
      "sedir",
    ];

    const hasRelevantKeyword = perfumeKeywords.some((keyword) =>
      q.includes(keyword),
    );

    // Anlamsız karakter dizisi kontrolü (sadece İngilizce harfler, Türkçe kelime değil)
    const onlyEnglishLetters = /^[a-zA-Z]+$/;
    const hasNoTurkishOrMeaning =
      onlyEnglishLetters.test(q) &&
      !hasRelevantKeyword &&
      q.length >= 3 &&
      q.length < 25;

    // Anlamsız mesaj kontrolü - Türkçe kelime yapısına uymayan
    if (hasNoTurkishOrMeaning) {
      return {
        isAllowed: false,
        response:
          "Hmm, tam anlayamadım 🤔 Sana nasıl yardımcı olabilirim? Parfüm mü arıyorsun?",
        isProfanity: false,
        shouldEndConversation: false,
      };
    }

    // Eğer hiçbir parfüm kelimesi yoksa, konu dışı - ZARİF YÖNLENDİRME
    if (!hasRelevantKeyword) {
      const offTopicResponses = [
        "Ah, keşke bu konuda da uzman olsam! 😊 Ama benim tutkum kokular. Şimdi sana özel bir parfüm bulalım mı?",
        "Güzel bir soru! Ben parfüm dünyasının uzmanıyım. 💫 Sana harika bir koku önerebilir miyim?",
        "Bu konuda bilgim sınırlı, ama koku konusunda sana çok yardımcı olabilirim! 🌸 Ne tür bir parfüm arıyorsun?",
        "Benim uzmanlık alanım parfümler! ✨ Haydi sana özel bir koku bulalım - kendine mi arıyorsun, hediye mi?",
      ];

      const randomResponse =
        offTopicResponses[Math.floor(Math.random() * offTopicResponses.length)];

      return {
        isAllowed: false,
        response: randomResponse,
        isProfanity: false,
        shouldEndConversation: false,
      };
    }

    return {
      isAllowed: true,
      response: "",
      isProfanity: false,
      shouldEndConversation: false,
    };
  }

  /**
   * Sorudan bilgi çıkar (isim, mevsim, cinsiyet vb.)
   */
  private extractIntent(question: string): {
    productName?: string;
    season?: string;
    gender?: string;
    isRecommendationRequest: boolean;
    isListRequest: boolean;
    needsClarification: boolean;
  } {
    const q = question.toLowerCase().trim();

    // Liste isteği mi? (daha önce kontrol et)
    const listKeywords = [
      "liste",
      "listesi",
      "hangi koular",
      "hangi kokular",
      "var mı",
      "neler var",
      "neler",
    ];
    const isListRequest = listKeywords.some((keyword) => q.includes(keyword));

    // Genel öneri isteği mi?
    const recommendationKeywords = [
      "öner",
      "öneri",
      "tavsiye",
      "tavsiye eder",
      "bul",
      "bulabilir misin",
      "ne önerirsin",
      "ne sürmeliyim",
    ];
    const isRecommendationRequest = recommendationKeywords.some((keyword) =>
      q.includes(keyword),
    );

    // Mevsim çıkarımı
    const seasons = ["yaz", "kış", "ilkbahar", "sonbahar", "bahar"];
    const foundSeason = seasons.find((s) => q.includes(s));

    // Cinsiyet çıkarımı
    const genderKeywords: Record<string, string> = {
      erkek: "erkek",
      kadın: "kadın",
      bay: "erkek",
      bayan: "kadın",
      unisex: "unisex",
    };
    let foundGender: string | undefined;
    for (const [key, value] of Object.entries(genderKeywords)) {
      if (q.includes(key)) {
        foundGender = value;
        break;
      }
    }

    // Parfüm ismi çıkarımı - İyileştirilmiş versiyon
    // Önce bilinen marka isimlerini kontrol et
    const knownBrands = [
      "creed",
      "tom ford",
      "mfk",
      "maison",
      "dior",
      "chanel",
      "ysl",
      "armani",
      "xerjoff",
      "pdm",
      "amouage",
    ];
    let productName: string | undefined;

    // Marka + model kombinasyonu ara (örn: "creed aventus")
    for (const brand of knownBrands) {
      if (q.includes(brand)) {
        // Markadan sonraki kelimeleri al
        const brandIndex = q.indexOf(brand);
        const afterBrand = q.substring(brandIndex + brand.length).trim();
        if (afterBrand.length > 0) {
          // Sonraki 1-2 kelimeyi al (model adı olabilir)
          const wordsAfterBrand = afterBrand.split(/\s+/).slice(0, 2);
          productName = `${brand} ${wordsAfterBrand.join(" ")}`.trim();
        } else {
          // Sadece marka varsa
          productName = brand;
        }
        break;
      }
    }

    // Eğer marka bulunamadıysa, büyük harfle başlayan kelimeleri ara
    // Ama cinsiyet/mevsim/genel kelimeleri hariç tut
    if (!productName) {
      const excludeWords = [
        // Cinsiyet
        "erkek",
        "kadın",
        "bay",
        "bayan",
        "unisex",
        // Mevsim
        "yaz",
        "kış",
        "ilkbahar",
        "sonbahar",
        "bahar",
        // Parfüm kelimeleri
        "parfüm",
        "parfümü",
        "parfümler",
        "parfümleriniz",
        "koku",
        "kokular",
        "arıyorum",
        "istiyorum",
        "öner",
        "tavsiye",
        "bul",
        // Kullanım
        "günlük",
        "gece",
        "özel",
        // Genel kelimeler
        "ben",
        "bir",
        "için",
        "merhaba",
        "selam",
        "hey",
        // Profilleme cevapları - BU KELİMELER ÜRÜN İSMİ DEĞİL!
        "hediye",
        "olarak",
        "kendim",
        "kendime",
        "kendi",
        "benim",
        "evet",
        "hayır",
        "tamam",
        "olur",
        "sevgili",
        "arkadaş",
        "anne",
        "baba",
        "eş",
        "karı",
        "koca",
        "doğum",
        "günü",
        "yıldönümü",
        "sürpriz",
        // Koku tarzı tercihleri - ÜRÜN İSMİ DEĞİL!
        "taze",
        "ferah",
        "ağır",
        "yoğun",
        "karizmatik",
        "hafif",
        "yumuşak",
        "soft",
        "güçlü",
        "kalıcı",
        "çiçeksi",
        "odunsu",
        "tatlı",
        "baharatlı",
        // Kullanım zamanı
        "gündüz",
        "akşam",
        "sabah",
        // Mevsim
        "yazlık",
        "kışlık",
        // Genel
        "hangisi",
        "bunlardan",
        "şunlardan",
        // Hazır soru kelimeleri - ÜRÜN İSMİ DEĞİL!
        "sadece",
        "göz",
        "atmak",
        "atıyorum",
        "bakıyorum",
        "bakmak",
        "tarz",
        "tarzı",
        "ne",
        "var",
        "neler",
        "hangi",
        "nasıl",
        // Diğer yaygın kelimeler
        "birine",
        "biri",
        "şey",
        "gibi",
        "tür",
        "türü",
        "çeşit",
        // Liste/göster kelimeleri - ÜRÜN İSMİ DEĞİL!
        "tüm",
        "tümü",
        "hepsi",
        "hepsini",
        "görmek",
        "göster",
        "listele",
        "liste",
        "bütün",
        "herşey",
        "her",
        "koleksiyon",
        "koleksiyonunuz",
      ];

      const words = question.split(/\s+/);
      const potentialNames = words.filter(
        (w) =>
          w.length > 2 &&
          /^[A-ZÇĞİÖŞÜ]/.test(w) &&
          !excludeWords.includes(w.toLowerCase()),
      );
      if (potentialNames.length > 0) {
        // İlk 2 kelimeyi al (marka + model)
        productName = potentialNames.slice(0, 2).join(" ");
      }
    }

    // "arıyorum", "istiyorum" varsa bu bir öneri isteği
    const searchKeywords = ["arıyorum", "istiyorum", "bakıyorum", "lazım"];
    const isSearchRequest = searchKeywords.some((k) => q.includes(k));

    // "arıyorum" + cinsiyet varsa, bu bir öneri isteği (ürün araması değil)
    const isGenderBasedRequest =
      isSearchRequest && !!foundGender && !productName;

    // Belirsizlik kontrolü - sadece gerçekten belirsizse sor
    // Liste isteği veya spesifik ürün ismi varsa belirsizlik yok
    const needsClarification =
      isRecommendationRequest &&
      !isListRequest &&
      !foundSeason &&
      !foundGender &&
      !productName &&
      !isGenderBasedRequest &&
      !q.includes("bakalım") && // "öner bakalım" gibi durumlar için
      q.length > 10; // Çok kısa mesajlar için değil

    return {
      productName,
      season: foundSeason,
      gender: foundGender,
      isRecommendationRequest: isRecommendationRequest || isGenderBasedRequest,
      isListRequest,
      needsClarification,
    };
  }

  /**
   * Conversation history'den kullanıcı profilini çıkar
   */
  private extractUserProfile(
    conversationHistory: ConversationMessage[],
  ): UserProfile {
    const profile: UserProfile = {
      collectedInfo: [],
      profilingComplete: false,
      questionAsked: 0,
      profanityCount: 0,
    };

    // Tüm kullanıcı mesajlarını analiz et
    const userMessages = conversationHistory
      .filter((m) => m.role === "user")
      .map((m) => m.content.toLowerCase());

    for (const msg of userMessages) {
      // Cinsiyet
      if (msg.includes("erkek") || msg.includes("bay")) {
        profile.gender = "erkek";
        profile.collectedInfo.push("Cinsiyet: Erkek");
      } else if (msg.includes("kadın") || msg.includes("bayan")) {
        profile.gender = "kadın";
        profile.collectedInfo.push("Cinsiyet: Kadın");
      } else if (msg.includes("unisex") || msg.includes("farketmez")) {
        profile.gender = "unisex";
        profile.collectedInfo.push("Cinsiyet: Unisex");
      }

      // Mevsim
      if (msg.includes("yaz") || msg.includes("sıcak")) {
        profile.season = "yaz";
        profile.collectedInfo.push("Mevsim: Yaz");
      } else if (msg.includes("kış") || msg.includes("soğuk")) {
        profile.season = "kış";
        profile.collectedInfo.push("Mevsim: Kış");
      } else if (msg.includes("ilkbahar") || msg.includes("bahar")) {
        profile.season = "ilkbahar";
        profile.collectedInfo.push("Mevsim: İlkbahar");
      } else if (msg.includes("sonbahar") || msg.includes("güz")) {
        profile.season = "sonbahar";
        profile.collectedInfo.push("Mevsim: Sonbahar");
      }

      // Kullanım ortamı
      if (
        msg.includes("günlük") ||
        msg.includes("her gün") ||
        msg.includes("ofis")
      ) {
        profile.occasion = "günlük";
        profile.collectedInfo.push("Kullanım: Günlük");
      } else if (msg.includes("iş") || msg.includes("toplantı")) {
        profile.occasion = "iş";
        profile.collectedInfo.push("Kullanım: İş");
      } else if (
        msg.includes("gece") ||
        msg.includes("akşam") ||
        msg.includes("parti")
      ) {
        profile.occasion = "gece";
        profile.collectedInfo.push("Kullanım: Gece");
      } else if (
        msg.includes("özel") ||
        msg.includes("randevu") ||
        msg.includes("romantik")
      ) {
        profile.occasion = "özel";
        profile.collectedInfo.push("Kullanım: Özel gün");
      }

      // Kişilik
      if (
        msg.includes("enerjik") ||
        msg.includes("dinamik") ||
        msg.includes("aktif")
      ) {
        profile.personality = "enerjik";
        profile.collectedInfo.push("Kişilik: Enerjik");
      } else if (
        msg.includes("sakin") ||
        msg.includes("huzurlu") ||
        msg.includes("rahat")
      ) {
        profile.personality = "sakin";
        profile.collectedInfo.push("Kişilik: Sakin");
      } else if (msg.includes("romantik") || msg.includes("duygusal")) {
        profile.personality = "romantik";
        profile.collectedInfo.push("Kişilik: Romantik");
      } else if (
        msg.includes("gizemli") ||
        msg.includes("çekici") ||
        msg.includes("karizmatik")
      ) {
        profile.personality = "gizemli";
        profile.collectedInfo.push("Kişilik: Gizemli");
      } else if (msg.includes("sportif") || msg.includes("ferah")) {
        profile.personality = "sportif";
        profile.collectedInfo.push("Kişilik: Sportif");
      }

      // Yoğunluk tercihi
      if (
        msg.includes("hafif") ||
        msg.includes("light") ||
        msg.includes("az")
      ) {
        profile.intensity = "hafif";
        profile.collectedInfo.push("Yoğunluk: Hafif");
      } else if (
        msg.includes("yoğun") ||
        msg.includes("ağır") ||
        msg.includes("strong")
      ) {
        profile.intensity = "yoğun";
        profile.collectedInfo.push("Yoğunluk: Yoğun");
      } else if (msg.includes("orta") || msg.includes("dengeli")) {
        profile.intensity = "orta";
        profile.collectedInfo.push("Yoğunluk: Orta");
      }

      // Nota tercihleri
      const noteKeywords = [
        "odunsu",
        "çiçeksi",
        "tatlı",
        "meyveli",
        "baharatlı",
        "ferah",
        "aquatik",
        "oryantal",
        "vanilya",
        "amber",
        "misk",
        "sedir",
        "sandal",
        "lavanta",
        "bergamot",
        "gül",
        "yasemin",
      ];
      for (const note of noteKeywords) {
        if (msg.includes(note)) {
          if (!profile.preferredNotes) profile.preferredNotes = [];
          if (!profile.preferredNotes.includes(note)) {
            profile.preferredNotes.push(note);
            profile.collectedInfo.push(`Nota tercihi: ${note}`);
          }
        }
      }

      // Kendisi için mi hediye mi tespiti
      if (
        msg.includes("kendim") ||
        msg.includes("kendime") ||
        msg.includes("benim için") ||
        msg.includes("kendi için")
      ) {
        profile.isForGift = false;
        if (!profile.collectedInfo.includes("Amaç: Kendisi için")) {
          profile.collectedInfo.push("Amaç: Kendisi için");
        }
      } else if (
        msg.includes("hediye") ||
        msg.includes("doğum günü") ||
        msg.includes("yıldönümü") ||
        msg.includes("sürpriz")
      ) {
        profile.isForGift = true;
        if (!profile.collectedInfo.includes("Amaç: Hediye")) {
          profile.collectedInfo.push("Amaç: Hediye");
        }
      }

      // Kime hediye (anne, baba, sevgili vb.)
      const recipientPatterns = [
        { pattern: "annem", label: "Anne" },
        { pattern: "anne", label: "Anne" },
        { pattern: "babam", label: "Baba" },
        { pattern: "baba", label: "Baba" },
        { pattern: "sevgilim", label: "Sevgili" },
        { pattern: "sevgili", label: "Sevgili" },
        { pattern: "eşim", label: "Eş" },
        { pattern: "karım", label: "Eş" },
        { pattern: "kocam", label: "Eş" },
        { pattern: "arkadaşım", label: "Arkadaş" },
        { pattern: "arkadaş", label: "Arkadaş" },
      ];
      for (const { pattern, label } of recipientPatterns) {
        if (msg.includes(pattern)) {
          profile.recipientInfo = label;
          if (!profile.collectedInfo.includes(`Alıcı: ${label}`)) {
            profile.collectedInfo.push(`Alıcı: ${label}`);
          }
          break;
        }
      }
    }

    // Profilleme tamamlandı mı kontrol et (en az 3 bilgi toplandıysa)
    const uniqueInfo = [...new Set(profile.collectedInfo)];
    profile.collectedInfo = uniqueInfo;
    profile.profilingComplete = uniqueInfo.length >= 3;

    return profile;
  }

  /**
   * Profilleme sorusu üret - Doğal ve bağlam farkında (3-4 soru derinliği)
   */
  private generateProfilingQuestion(
    profile: UserProfile,
    requiredInfoCount: number,
  ): {
    question: string;
    options: Array<{ text: string; value: string }>;
  } | null {
    // MİNİMUM 3 BİLGİ TOPLANMADAN ÖNERİ YAPMA!
    // requiredInfoCount = kaç gerekli bilgi toplandı (0-4 arası)
    if (requiredInfoCount >= 3 || profile.profilingComplete) {
      return null;
    }

    // Doğal geçiş ifadeleri
    const transitions = [
      "Harika! 💫",
      "Tamam, anladım! ✨",
      "Güzel tercih! 🌟",
      "Süper! 💎",
      "Çok güzel! 🌸",
    ];
    const randomTransition =
      transitions[Math.floor(Math.random() * transitions.length)];

    // Empati ifadeleri
    const empathyPhrases = [
      "Seni çok iyi anlıyorum. ",
      "Ne güzel bir düşünce! ",
      "",
    ];
    const randomEmpathy =
      empathyPhrases[Math.floor(Math.random() * empathyPhrases.length)];

    // Hangi bilgiler eksik?
    const hasPurpose =
      profile.isForGift !== undefined ||
      profile.collectedInfo.some((info) => info.startsWith("Amaç:"));
    const hasGender = profile.gender !== undefined;
    const hasOccasion =
      profile.occasion !== undefined ||
      profile.collectedInfo.some((info) => info.startsWith("Kullanım:"));
    const hasStyle =
      profile.intensity !== undefined ||
      profile.collectedInfo.some((info) => info.startsWith("Yoğunluk:")) ||
      (profile.preferredNotes && profile.preferredNotes.length > 0);

    // SORU 1: Kendisi mi hediye mi? (purpose)
    if (!hasPurpose) {
      return {
        question:
          "Kendine mi arıyorsun, yoksa birine özel bir hediye mi planlıyorsun? 🎁",
        options: [
          { text: "Kendim için 🧴", value: "Kendim için parfüm arıyorum" },
          {
            text: "Hediye için 🎁",
            value: "Birine hediye için parfüm arıyorum",
          },
        ],
      };
    }

    // SORU 2: Cinsiyet bilgisi yoksa sor
    if (!hasGender) {
      const question = profile.isForGift
        ? `${randomTransition} ${randomEmpathy}Hediye alacağın kişi erkek mi kadın mı?`
        : `${randomTransition} Erkek parfümü mü kadın parfümü mü arıyorsun?`;

      return {
        question,
        options: [
          { text: "Erkek 🧔", value: "Erkek parfümü arıyorum" },
          { text: "Kadın 💄", value: "Kadın parfümü arıyorum" },
          { text: "Unisex ⚡", value: "Unisex parfüm tercih ederim" },
        ],
      };
    }

    // SORU 3: Kullanım zamanı/ortamı (occasion)
    if (!hasOccasion) {
      return {
        question: `${randomTransition} Bu kokuyu ne zaman kullanmayı düşünüyorsun?`,
        options: [
          {
            text: "Günlük kullanım ☀️",
            value: "Günlük kullanım için arıyorum",
          },
          { text: "İş/Ofis 💼", value: "İş ve ofis ortamı için arıyorum" },
          {
            text: "Özel geceler 🌙",
            value: "Özel geceler ve randevular için arıyorum",
          },
          {
            text: "Her ortamda 🌟",
            value: "Her ortamda kullanabileceğim bir şey istiyorum",
          },
        ],
      };
    }

    // SORU 4: Koku tarzı/yoğunluğu (style)
    if (!hasStyle) {
      return {
        question: `${randomTransition} Ne tür bir his arıyorsun?`,
        options: [
          {
            text: "Ferah ve hafif 🌊",
            value: "Ferah ve hafif bir koku istiyorum",
          },
          {
            text: "Yoğun ve iz bırakan 🔥",
            value: "Yoğun ve iz bırakan bir koku istiyorum",
          },
          {
            text: "Sıcak ve sarmalayıcı 🍂",
            value: "Sıcak ve sarmalayıcı bir koku istiyorum",
          },
          {
            text: "Taze ve enerjik ✨",
            value: "Taze ve enerjik bir koku istiyorum",
          },
        ],
      };
    }

    // Yeterli bilgi toplandı, profilleme tamamlandı
    return null;
  }

  /**
   * Profile göre ürün önerisi oluştur
   */
  private async getRecommendationsForProfile(
    profile: UserProfile,
  ): Promise<any[]> {
    const filter: any = { status: "active" };

    // Cinsiyet filtresi
    if (profile.gender === "erkek") {
      filter.gender = { $in: ["male", "unisex"] };
    } else if (profile.gender === "kadın") {
      filter.gender = { $in: ["female", "unisex"] };
    }

    // Mevsim karakteristik filtresi
    if (profile.season) {
      const seasonTraits: Record<string, string[]> = {
        yaz: ["ferah", "aquatik", "citrusy", "light", "narenciyeli"],
        kış: ["woody", "warm", "spicy", "sweet", "sıcak", "baharatlı"],
        ilkbahar: ["fresh", "floral", "light", "green", "çiçeksi"],
        sonbahar: ["spicy", "woody", "warm", "amber", "oriental"],
      };
      const traits = seasonTraits[profile.season] || [];
      if (traits.length > 0) {
        filter.characteristics = { $in: traits };
      }
    }

    // Nota tercihi filtresi
    if (profile.preferredNotes && profile.preferredNotes.length > 0) {
      filter.notes = { $in: profile.preferredNotes };
    }

    const products = await Product.find(filter).limit(10).lean();

    // Yoğunluk tercihine göre sırala
    if (profile.intensity && products.length > 0) {
      // Bu basit bir yaklaşım - gerçek uygulamada longevity/sillage skorları kullanılabilir
      return products.slice(0, 3);
    }

    return products.slice(0, 3);
  }

  /**
   * Betimleyici ürün açıklaması oluştur - VERİTABANINDAKİ GERÇEK NOTALARI KULLAN
   * ⚠️ ASLA uydurma nota veya bilgi üretme!
   */
  private generatePoetricDescription(
    product: any,
    profile: UserProfile,
  ): string {
    const notes = Array.isArray(product.notes) ? product.notes : [];
    const chars = Array.isArray(product.characteristics)
      ? product.characteristics
      : [];

    let description = "";

    // SADECE veritabanındaki gerçek notaları göster
    if (notes.length > 0) {
      const notesText = notes.slice(0, 4).join(", ");
      description = notesText;
    }

    // Karakteristik varsa ekle
    if (chars.length > 0) {
      const charText = chars.slice(0, 2).join(", ").toLowerCase();
      if (description) {
        description += ` - ${charText}`;
      } else {
        description = charText;
      }
    }

    // Nota ve karakteristik YOKSA - ürün açıklamasından al
    if (!description && product.description) {
      const shortDesc = product.description.split(".")[0];
      return shortDesc.length > 80
        ? shortDesc.substring(0, 80) + "..."
        : shortDesc;
    }

    // Hiçbir bilgi YOKSA - nota uydurma!
    if (!description) {
      return "koleksiyonumuzda mevcut";
    }

    return description;
  }

  /**
   * Serbest metin sorusu sor - Conversation History destekli
   * Returns: { message: string, recommendedProducts?: Array<{id, name, brand}>, userProfile?: UserProfile }
   */
  async askAboutPerfume(
    question: string,
    perfumeId?: string,
    conversationHistory: ConversationMessage[] = [],
  ): Promise<{
    message: string;
    recommendedProducts?: Array<{ id: string; name: string; brand: string }>;
    options?: Array<{ text: string; value: string }>;
    userProfile?: UserProfile;
  }> {
    try {
      this.checkApiKey();
    } catch (error) {
      throw new Error("AI_SERVICE_UNAVAILABLE");
    }

    try {
      // 0. Kullanıcı profilini çıkar (profanityCount'u almak için önce)
      const userProfile = this.extractUserProfile([
        ...conversationHistory,
        { role: "user", content: question },
      ]);

      // 1. GÜVENLİK KONTROLLERİ - 3 aşamalı küfür sistemi
      const securityCheck = this.checkSecurity(
        question,
        userProfile.profanityCount,
      );

      if (!securityCheck.isAllowed) {
        // Küfür tespit edildiyse, sayacı güncelle
        if (securityCheck.isProfanity) {
          userProfile.profanityCount = (userProfile.profanityCount || 0) + 1;
        }

        return {
          message: securityCheck.response,
          userProfile,
        };
      }

      // 3. Selamlama kontrolü - her mesajda kontrol et (satış temsilcisi gibi davran)
      const greetingCheck = this.checkGreeting(question, conversationHistory);
      if (greetingCheck.isGreeting) {
        return {
          message: greetingCheck.response,
          options: greetingCheck.options,
          userProfile,
        };
      }

      // 3.5. Hazır soru (quick reply) kontrolü - öncelikli!
      const quickReplyCheck = this.checkQuickReply(question, userProfile);
      if (quickReplyCheck.isQuickReply) {
        // Profil güncellemelerini uygula
        if (quickReplyCheck.profileUpdates) {
          Object.assign(userProfile, quickReplyCheck.profileUpdates);
          
          // collectedInfo'yu güncelle
          if (quickReplyCheck.profileUpdates.isForGift !== undefined) {
            const infoText = quickReplyCheck.profileUpdates.isForGift ? "Amaç: Hediye" : "Amaç: Kendisi için";
            if (!userProfile.collectedInfo.includes(infoText)) {
              userProfile.collectedInfo.push(infoText);
            }
          }
          if (quickReplyCheck.profileUpdates.gender) {
            const genderText = `Cinsiyet: ${quickReplyCheck.profileUpdates.gender.charAt(0).toUpperCase() + quickReplyCheck.profileUpdates.gender.slice(1)}`;
            if (!userProfile.collectedInfo.includes(genderText)) {
              userProfile.collectedInfo.push(genderText);
            }
          }
          if (quickReplyCheck.profileUpdates.occasion) {
            const occasionMap: Record<string, string> = {
              'günlük': 'Günlük',
              'iş': 'İş',
              'gece': 'Gece/Özel',
              'özel': 'Özel gün'
            };
            const occasionText = `Kullanım: ${occasionMap[quickReplyCheck.profileUpdates.occasion] || quickReplyCheck.profileUpdates.occasion}`;
            if (!userProfile.collectedInfo.includes(occasionText)) {
              userProfile.collectedInfo.push(occasionText);
            }
          }
          if (quickReplyCheck.profileUpdates.intensity) {
            const intensityText = `Yoğunluk: ${quickReplyCheck.profileUpdates.intensity.charAt(0).toUpperCase() + quickReplyCheck.profileUpdates.intensity.slice(1)}`;
            if (!userProfile.collectedInfo.includes(intensityText)) {
              userProfile.collectedInfo.push(intensityText);
            }
          }
          if (quickReplyCheck.profileUpdates.preferredNotes && quickReplyCheck.profileUpdates.preferredNotes.length > 0) {
            for (const note of quickReplyCheck.profileUpdates.preferredNotes) {
              const noteText = `Nota tercihi: ${note}`;
              if (!userProfile.collectedInfo.includes(noteText)) {
                userProfile.collectedInfo.push(noteText);
              }
            }
          }
        }

        // Özel işaretçileri kontrol et
        if (quickReplyCheck.response === "PROFILING_COMPLETE") {
          // Profilleme tamamlandı - DİREKT ÖNERİ YAP!
          userProfile.profilingComplete = true;
          
          // Profil bazlı öneri al
          const recommendations = await this.getRecommendationsForProfile(userProfile);
          
          if (recommendations.length > 0) {
            const recText = recommendations
              .map((p) => {
                const poetricDesc = this.generatePoetricDescription(p, userProfile);
                return `• **${p.name}** (${p.brand})\n  ${poetricDesc}`;
              })
              .join("\n\n");

            // Profil özeti oluştur
            const transitions = ["Harika seçim! 💎", "Tam senlik! ✨", "Mükemmel tercih! 🌟"];
            const randomTransition = transitions[Math.floor(Math.random() * transitions.length)];
            
            let profileSummary = randomTransition;
            if (userProfile.collectedInfo.length > 0) {
              const infoText = userProfile.collectedInfo
                .slice(0, 3)
                .map((info) => info.split(": ")[1] || info)
                .join(", ")
                .toLowerCase();
              profileSummary += ` ${infoText} tercihlerine göre sana özel seçtim:`;
            } else {
              profileSummary += " Sana özel seçtiklerim:";
            }

            return {
              message: `${profileSummary}\n\n${recText}\n\nHangisi dikkatini çekti? Birini daha yakından incelemek ister misin?`,
              recommendedProducts: recommendations.map((p) => ({
                id: p.id,
                name: p.name,
                brand: p.brand,
              })),
              userProfile,
            };
          }
        } else if (quickReplyCheck.response === "LIST_REQUEST") {
          // Liste isteği - parfümleri göster ve profillemeye devam et
          const sampleProducts = await Product.find({ status: "active" })
            .limit(8)
            .select("name brand gender")
            .lean();

          const maleProducts = sampleProducts.filter((p: any) => p.gender === "male" || p.gender === "unisex").slice(0, 3);
          const femaleProducts = sampleProducts.filter((p: any) => p.gender === "female" || p.gender === "unisex").slice(0, 3);

          let productList = "**Erkek Parfümleri:**\n";
          productList += maleProducts.map((p: any) => `• ${p.name} (${p.brand})`).join("\n");
          productList += "\n\n**Kadın Parfümleri:**\n";
          productList += femaleProducts.map((p: any) => `• ${p.name} (${p.brand})`).join("\n");

          return {
            message: `İşte koleksiyonumuzdan bir kesit: ✨\n\n${productList}\n\nSeni daha iyi tanımak isterim - hangi tarafa daha çok ilgi duyuyorsun?`,
            options: [
              { text: "Erkek parfümleri 🧔", value: "Erkek parfümlerine bakmak istiyorum" },
              { text: "Kadın parfümleri 💄", value: "Kadın parfümlerine bakmak istiyorum" },
            ],
            userProfile,
          };
        } else {
          // Normal cevap döndür
          return {
            message: quickReplyCheck.response!,
            options: quickReplyCheck.options,
            userProfile,
          };
        }
      }

      // 4. Eğer belirli bir parfüm ID'si varsa, direkt onu döndür
      if (perfumeId) {
        const perfume = await Product.findOne({
          id: perfumeId,
          status: "active",
        });
        if (perfume) {
          const poetricDesc = this.generatePoetricDescription(
            perfume,
            userProfile,
          );

          return {
            message: `${perfume.name} harika bir seçim! 💫 ${poetricDesc}. ${perfume.price} TL.`,
            recommendedProducts: [
              { id: perfume.id, name: perfume.name, brand: perfume.brand },
            ],
            userProfile,
          };
        }
      }

      // 5. Sorudan intent çıkar
      const intent = this.extractIntent(question);

      // 6. Profilleme kontrolü - MİNİMUM 3 BİLGİ OLMADAN ÖNERİ YAPMA!
      // Gerekli bilgiler: gender, purpose (kendine/hediye), occasion (günlük/özel), style (taze/ağır)
      const hasGender = userProfile.gender !== undefined;
      const hasPurpose =
        userProfile.isForGift !== undefined ||
        userProfile.collectedInfo.some((info) => info.startsWith("Amaç:"));
      const hasOccasion =
        userProfile.occasion !== undefined ||
        userProfile.collectedInfo.some((info) => info.startsWith("Kullanım:"));
      const hasStyle =
        userProfile.intensity !== undefined ||
        userProfile.collectedInfo.some((info) =>
          info.startsWith("Yoğunluk:"),
        ) ||
        userProfile.collectedInfo.some((info) =>
          info.startsWith("Nota tercihi:"),
        ) ||
        (userProfile.preferredNotes && userProfile.preferredNotes.length > 0);

      const requiredInfoCount = [
        hasGender,
        hasPurpose,
        hasOccasion,
        hasStyle,
      ].filter(Boolean).length;

      // Mesaj sayısını da kontrol et - EN AZ 3 MESAJ OLMADAN ÖNERİ YAPMA!
      // conversationHistory sadece önceki mesajları içerir, şu anki dahil değil
      const messageCount = conversationHistory.filter(m => m.role === "user").length + 1; // +1 şu anki mesaj
      
      // EN AZ 3 BİLGİ VE 3 MESAJ OLMADAN ÖNERİ YAPMA!
      // Sadece profilingComplete true ise (checkQuickReply'dan gelirse) hemen öneri yap
      const hasEnoughInfo =
        (requiredInfoCount >= 3 && messageCount >= 3) || userProfile.profilingComplete;

      // Profilleme aşaması - SADECE yeterli bilgi yoksa soru sor
      // ÖNEMLİ: isRecommendationRequest olsa bile profilleme yap!
      if (!hasEnoughInfo && !intent.productName && !intent.isListRequest) {
        const profilingResult = this.generateProfilingQuestion(
          userProfile,
          requiredInfoCount, // Toplanan gerekli bilgi sayısını kullan
        );
        if (profilingResult) {
          return {
            message: profilingResult.question,
            options: profilingResult.options,
            userProfile,
          };
        }
      }

      // 7. Liste isteği
      if (intent.isListRequest) {
        const sampleProducts = await Product.find({ status: "active" })
          .limit(8)
          .select("name brand gender")
          .lean();

        const productList = sampleProducts
          .map((p) => `• ${p.name} (${p.brand})`)
          .join("\n");

        return {
          message: `İşte koleksiyonumuzdan bazı seçenekler: ✨\n\n${productList}\n\nHangi tarz dikkatini çekti?`,
          userProfile,
        };
      }

      // 8. Parfüm ismi varsa DB'de ara
      if (intent.productName) {
        let searchResults = await this.searchProductsInDB(intent.productName);

        if (searchResults.length === 0) {
          const brandOnly = intent.productName.split(" ")[0];
          searchResults = await this.searchProductsInDB(brandOnly);
        }

        if (searchResults.length > 0) {
          const foundProduct = searchResults[0];
          const poetricDesc = this.generatePoetricDescription(
            foundProduct,
            userProfile,
          );

          return {
            message: `Evet, ${foundProduct.name} koleksiyonumuzda var! 💫 ${poetricDesc}. Fiyat: ${foundProduct.price} TL.`,
            recommendedProducts: [
              {
                id: foundProduct.id,
                name: foundProduct.name,
                brand: foundProduct.brand,
              },
            ],
            userProfile,
          };
        } else {
          // Bulunamadı - benzer öner
          const knownProfile = this.getKnownPerfumeProfile(intent.productName);
          let similarProducts: any[] = [];

          if (knownProfile) {
            similarProducts = await this.findSimilarByProfile(knownProfile);
          } else {
            similarProducts =
              await this.getRecommendationsForProfile(userProfile);
          }

          similarProducts = similarProducts.slice(0, 2);

          if (similarProducts.length > 0) {
            const suggestions = similarProducts
              .map((p) => {
                const poetricDesc = this.generatePoetricDescription(
                  p,
                  userProfile,
                );
                return `• **${p.name}** - ${poetricDesc}`;
              })
              .join("\n\n");

            return {
              message: `"${intent.productName}" şu an koleksiyonumuzda yok ama sana çok yakışacak alternatiflerim var! 🌟\n\n${suggestions}\n\nHangisi ilgini çekti?`,
              recommendedProducts: similarProducts.map((p) => ({
                id: p.id,
                name: p.name,
                brand: p.brand,
              })),
              userProfile,
            };
          }
        }
      }

      // 9. Profile göre öneri (SADECE yeterli bilgi toplandıysa!)
      // EN AZ 3 BİLGİ OLMADAN ÖNERİ YAPMA!
      if (hasEnoughInfo) {
        const recommendations =
          await this.getRecommendationsForProfile(userProfile);

        if (recommendations.length > 0) {
          const recText = recommendations
            .map((p) => {
              const poetricDesc = this.generatePoetricDescription(
                p,
                userProfile,
              );
              return `• **${p.name}** (${p.brand})\n  ${poetricDesc}`;
            })
            .join("\n\n");

          // Doğal geçiş ifadeleri
          const transitions = [
            "Harika, anladım! 💎",
            "Tamam, çok güzel! ✨",
            "Süper tercih! 🌟",
            "Seni çok iyi anlıyorum! 💫",
          ];
          const randomTransition =
            transitions[Math.floor(Math.random() * transitions.length)];

          // Profil özeti oluştur
          let profileSummary = "";
          if (userProfile.collectedInfo.length > 0) {
            const infoText = userProfile.collectedInfo
              .slice(0, 2)
              .map((info) => info.split(": ")[1] || info)
              .join(", ")
              .toLowerCase();
            profileSummary = `${randomTransition} Senin için ${infoText} tercihlerine göre seçtim:`;
          } else {
            profileSummary = `${randomTransition} Sana özel seçtiklerim:`;
          }

          // Satış kapama cümleleri - doğal ve ikna edici
          const salesClosings = [
            "\n\nBu hafta en çok tercih edilen kokulardan! Hangisini denemek istersin?",
            "\n\nBunlar senin tarzına çok yakışır. Hangisi dikkatini çekti?",
            "\n\nHer biri kalıcılığıyla dikkat çekiyor. Birini daha yakından inceleyelim mi?",
            "\n\nSana özel seçtim! Hangisi hakkında daha fazla bilgi vereyim?",
          ];
          const salesClosing =
            salesClosings[Math.floor(Math.random() * salesClosings.length)];

          return {
            message: `${profileSummary}\n\n${recText}${salesClosing}`,
            recommendedProducts: recommendations.map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand,
            })),
            userProfile,
          };
        }
      }

      // 10. RAG ile zengin yanıt üret
      // Kullanıcı sorusuna göre en alakalı ürünleri bul
      let ragContext: RAGContext;

      try {
        // Önce profil bazlı RAG dene
        if (userProfile.collectedInfo.length > 0) {
          ragContext = await recommendByProfile({
            gender: userProfile.gender,
            season: userProfile.season,
            occasion: userProfile.occasion,
            personality: userProfile.personality,
            preferredNotes: userProfile.preferredNotes,
            intensity: userProfile.intensity,
            ageGroup: userProfile.ageGroup,
          });
        } else {
          // Soru bazlı RAG
          ragContext = await retrieveRelevantProducts(question, 8, {
            gender:
              userProfile.gender === "kadın"
                ? "female"
                : userProfile.gender === "erkek"
                  ? "male"
                  : undefined,
          });
        }
      } catch (ragError) {
        console.warn("RAG error, falling back to direct query:", ragError);
        // Fallback: direkt DB sorgusu
        const allPerfumes = await Product.find({ status: "active" })
          .limit(15)
          .select("name notes gender price characteristics brand description")
          .lean();

        ragContext = {
          products: allPerfumes.map((p: any) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            description: p.description,
            notes: p.notes || [],
            characteristics: p.characteristics || [],
            gender: p.gender,
            category: p.category,
            price: p.price,
            ml: p.ml,
            ageRange: p.ageRange,
            score: 0.5,
          })),
          totalFound: allPerfumes.length,
          query: question,
          contextText: "",
        };
      }

      // RAG context'ten parfüm bilgisi oluştur
      const perfumeContext = ragContext.products
        .map((p) => {
          const notes =
            p.notes.length > 0
              ? `Notalar: ${p.notes.join(", ")}`
              : "Notalar: BİLİNMİYOR (bu parfümün notalarını UYDURMA!)";
          const chars =
            p.characteristics.length > 0
              ? `Özellikler: ${p.characteristics.join(", ")}`
              : "";
          return `- ${p.name} (${p.brand}): ${notes}${
            chars ? `. ${chars}` : ""
          }. Fiyat: ${p.price} TL`;
        })
        .join("\n");

      const conversationContext = conversationHistory
        .slice(-6)
        .map((m) => `${m.role === "user" ? "Müşteri" : "Mira"}: ${m.content}`)
        .join("\n");

      const profileContext =
        userProfile.collectedInfo.length > 0
          ? `\nMüşteri Profili: ${userProfile.collectedInfo.join(", ")}`
          : "";

      const prompt = `${MIRA_SYSTEM_PROMPT}

### MEVCUT PARFÜM KOLEKSİYONU:
${perfumeContext}
${profileContext}

### SOHBET GEÇMİŞİ:
${conversationContext}

Müşteri: ${question}

Mira (samimi, betimleyici dille, max 3 cümle):`;

      const response = await this.client!.messages.create({
        model: this.model,
        max_tokens: 250,
        temperature: 0.1, // Düşük sıcaklık = tutarlı, halüsinasyonsuz cevaplar
        messages: [{ role: "user", content: prompt }],
      });

      if (!response.content || response.content.length === 0) {
        return {
          message:
            "Üzgünüm, şu an yanıt veremiyorum. Birazdan tekrar dener misin? 💫",
          userProfile,
        };
      }

      const content = response.content[0];
      if (content.type !== "text") {
        return {
          message:
            "Üzgünüm, şu an yanıt veremiyorum. Birazdan tekrar dener misin? 💫",
          userProfile,
        };
      }

      return {
        message: content.text,
        userProfile,
      };
    } catch (error: any) {
      console.error("Librarian Agent Error:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        type: error.type,
      });

      if (
        error.message === "AI_SERVICE_UNAVAILABLE" ||
        error.status === 401 ||
        error.message?.includes("authentication") ||
        error.message?.includes("API key")
      ) {
        throw new Error("AI_SERVICE_UNAVAILABLE");
      }

      if (error.status === 429) {
        throw new Error("AI_SERVICE_UNAVAILABLE");
      }

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
