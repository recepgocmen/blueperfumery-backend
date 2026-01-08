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
    limit: number = 5
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
            note.toLowerCase().includes(pn.toLowerCase())
        )
      );
      const noteScore =
        (matchingNotes.length / Math.max(referenceNotes.length, 1)) * 50;

      // Karakteristik benzerliği
      const matchingChars = referenceChars.filter((char: string) =>
        productChars.some(
          (pc: string) =>
            pc.toLowerCase().includes(char.toLowerCase()) ||
            char.toLowerCase().includes(pc.toLowerCase())
        )
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
    limit: number = 10
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
              n.toLowerCase().includes(pn.toLowerCase())
          )
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
   * Selamlama kontrolü - samimi sohbet yap
   */
  private checkGreeting(question: string): {
    isGreeting: boolean;
    response: string;
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
      (g) => q === g || q === `${g}!` || q === `${g}.` || q === `${g}?`
    );

    // Selamlama + başka bir şey mi?
    const startsWithGreeting = greetings.some((g) => q.startsWith(g));
    const hasMoreContent = q.length > 15; // Selamlamadan sonra başka içerik var mı

    if (isOnlyGreeting || (startsWithGreeting && !hasMoreContent)) {
      // Tanışmaya yönelik samimi cevaplar - hemen parfüm tavsiyesi verme
      const responses = [
        "Selam! 💫 Ben Mira. Tanıştığımıza çok memnunum! Bugün nasılsın?",
        "Merhaba! ✨ Ben Mira, Blue Perfumery'nin parfüm danışmanı. Seni tanımak isterim, ne arıyorsun?",
        "Hey! 🌟 Hoş geldin! Ben Mira. Sen kimsin, sana nasıl yardımcı olabilirim?",
        "Selam! 💎 Ben Mira. Seni dinliyorum, bugün nasıl hissediyorsun?",
        "Merhaba! 🌸 Ben Mira. Seninle sohbet etmek güzel, nasıl yardımcı olabilirim?",
      ];
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      return {
        isGreeting: true,
        response: randomResponse,
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
        "İyiyim, teşekkürler! 💫 Sen nasılsın? Seni biraz tanımak isterim!",
        "Çok iyiyim! ✨ Sen nasılsın? Bugün enerjin nasıl?",
        "Harikayım! 🌟 Sen de iyi misin? Biraz sohbet edelim mi?",
        "Süperim! 💎 Sen nasılsın? Bugün ne hissediyorsun?",
      ];
      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      return {
        isGreeting: true,
        response: randomResponse,
      };
    }

    return { isGreeting: false, response: "" };
  }

  /**
   * Güvenlik kontrolü - küfür ve konu dışı sorular
   */
  private checkSecurity(question: string): {
    isAllowed: boolean;
    response: string;
  } {
    const q = question.toLowerCase().trim();

    // Küfür listesi (Türkçe yaygın küfürler - sansürlü)
    const profanityList = [
      "sik",
      "sık",
      "amk",
      "aq",
      "oç",
      "piç",
      "orospu",
      "yarrak",
      "göt",
      "meme",
      "seks",
      "fuck",
      "shit",
      "ass",
      "bitch",
      "dick",
      "pussy",
      "damn",
      "crap",
      "bok",
      "lan",
      "salak",
      "aptal",
      "mal",
      "gerizekalı",
      "beyinsiz",
      "enayi",
    ];

    // Küfür kontrolü
    for (const word of profanityList) {
      if (q.includes(word)) {
        return {
          isAllowed: false,
          response:
            "Hey, 💫 Nazik bir dil kullanalım, olur mu? Ben Mira, parfüm konusunda yardımcı olabilirim!",
        };
      }
    }

    // Konu dışı/tehlikeli konular
    const offTopicPatterns = [
      // Şiddet
      "öldür",
      "vur",
      "döv",
      "bıçak",
      "silah",
      "bomba",
      "patlat",
      "yakala",
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
      "banka",
      // Siyaset/din
      "siyaset",
      "parti",
      "seçim",
      "din",
      "allah",
      "tanrı",
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
            "Ben Mira, parfüm konularında uzmanım! 💎 Bu konuda yardımcı olamam ama parfüm hakkında konuşalım mı?",
        };
      }
    }

    // Çok kısa veya anlamsız mesajlar (spam kontrolü)
    if (q.length < 2) {
      return {
        isAllowed: false,
        response: "Merhaba! 💫 Ben Mira. Sana nasıl yardımcı olabilirim?",
      };
    }

    // Parfüm ile alakalı olup olmadığını kontrol et
    const perfumeKeywords = [
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
      "merhaba",
      "selam",
      "nasıl",
      "ne",
      "hangi",
      "var",
      "liste",
      "fiyat",
      "al",
      "satın",
      "sipariş",
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
      q.includes(keyword)
    );

    // Eğer hiçbir parfüm kelimesi yoksa ve soru uzunsa, muhtemelen konu dışı
    if (!hasRelevantKeyword && q.length > 50) {
      return {
        isAllowed: false,
        response:
          "Ben Blue Perfumery'nin parfüm danışmanıyım 🌸 Sadece parfüm konularında yardımcı olabilirim. Sana özel bir koku bulmamı ister misin?",
      };
    }

    return { isAllowed: true, response: "" };
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
      q.includes(keyword)
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
    if (!productName) {
      const words = question.split(/\s+/);
      const potentialNames = words.filter(
        (w) => w.length > 2 && /^[A-ZÇĞİÖŞÜ]/.test(w)
      );
      if (potentialNames.length > 0) {
        // İlk 2 kelimeyi al (marka + model)
        productName = potentialNames.slice(0, 2).join(" ");
      }
    }

    // Belirsizlik kontrolü - sadece gerçekten belirsizse sor
    // Liste isteği veya spesifik ürün ismi varsa belirsizlik yok
    const needsClarification =
      isRecommendationRequest &&
      !isListRequest &&
      !foundSeason &&
      !foundGender &&
      !productName &&
      !q.includes("bakalım") && // "öner bakalım" gibi durumlar için
      q.length > 10; // Çok kısa mesajlar için değil

    return {
      productName,
      season: foundSeason,
      gender: foundGender,
      isRecommendationRequest,
      isListRequest,
      needsClarification,
    };
  }

  /**
   * Serbest metin sorusu sor - Geliştirilmiş versiyon
   * Returns: { message: string, recommendedProducts?: Array<{id, name, brand}> }
   */
  async askAboutPerfume(
    question: string,
    perfumeId?: string
  ): Promise<{
    message: string;
    recommendedProducts?: Array<{ id: string; name: string; brand: string }>;
  }> {
    try {
      this.checkApiKey();
    } catch (error) {
      throw new Error("AI_SERVICE_UNAVAILABLE");
    }

    try {
      // 0. GÜVENLİK KONTROLLERİ
      const securityCheck = this.checkSecurity(question);
      if (!securityCheck.isAllowed) {
        return {
          message: securityCheck.response,
        };
      }

      // 0.5 SELAMLAMA KONTROLÜ - samimi sohbet yap
      const greetingCheck = this.checkGreeting(question);
      if (greetingCheck.isGreeting) {
        return {
          message: greetingCheck.response,
        };
      }

      // 1. Eğer belirli bir parfüm ID'si varsa, direkt onu döndür
      if (perfumeId) {
        const perfume = await Product.findOne({
          id: perfumeId,
          status: "active",
        });
        if (perfume) {
          const notes = Array.isArray(perfume.notes) ? perfume.notes : [];
          const characteristics = Array.isArray(perfume.characteristics)
            ? perfume.characteristics
            : [];

          const context = `
Parfüm Bilgisi:
- İsim: ${perfume.name}
- Marka: ${perfume.brand}
- Notalar: ${notes.length > 0 ? notes.join(", ") : "Belirtilmemiş"}
- Karakteristikler: ${
            characteristics.length > 0
              ? characteristics.join(", ")
              : "Belirtilmemiş"
          }
- Cinsiyet: ${perfume.gender}
- Fiyat: ${perfume.price} TL
- Açıklama: ${perfume.description}
`;

          const prompt = `Sen "Mira" - Blue Perfumery'nin samimi parfüm danışmanı.

⚠️ ÖNEMLİ: MAX 2-3 CÜMLE! Uzun yazma.

Stil:
- Sen dili, samimi, arkadaşça
- 1 emoji yeter
- Parfüm hakkında bilgi ver

${context}

Müşteri: ${question}

Mira (kısa cevap):`;

          const response = await this.client!.messages.create({
            model: this.model,
            max_tokens: 200,
            messages: [{ role: "user", content: prompt }],
          });

          const content = response.content[0];
          if (content.type === "text") {
            return {
              message: content.text,
              recommendedProducts: [
                { id: perfume.id, name: perfume.name, brand: perfume.brand },
              ],
            };
          }
        }
      }

      // 2. Sorudan intent çıkar
      const intent = this.extractIntent(question);

      // 3. Liste isteği - kısa ve öz liste göster
      if (intent.isListRequest) {
        const sampleProducts = await Product.find({ status: "active" })
          .limit(8)
          .select("name brand gender")
          .lean();

        const productList = sampleProducts
          .map((p) => `• ${p.name} (${p.brand})`)
          .join("\n");

        return {
          message: `Koleksiyonumuzdan örnekler: ✨\n\n${productList}\n\nDaha fazla görmek için kategori sayfalarına bakabilirsin!`,
        };
      }

      // 4. Belirsizlik durumunda detay sor (ama sadece gerçekten belirsizse)
      if (intent.needsClarification) {
        return {
          message:
            "Tabii! Sana daha iyi önerebilmek için birkaç şey öğrenebilir miyim? 🌸\n\nNasıl bir koku arıyorsun?\n- Erkek / Kadın / Unisex\n- Hangi mevsim için? (Yaz / Kış / İlkbahar / Sonbahar)\n- Ne tür bir koku? (Tatlı / Çiçeksi / Odunsu / Ferah vb.)",
        };
      }

      // 5. Parfüm ismi varsa DB'de ara
      if (intent.productName) {
        // Önce tam isimle ara
        let searchResults = await this.searchProductsInDB(intent.productName);

        // Bulunamazsa sadece marka ile ara
        if (searchResults.length === 0) {
          const brandOnly = intent.productName.split(" ")[0];
          searchResults = await this.searchProductsInDB(brandOnly);
        }

        if (searchResults.length > 0) {
          // Bulundu - ilk sonucu göster
          const foundProduct = searchResults[0];
          const notes = Array.isArray(foundProduct.notes)
            ? foundProduct.notes
            : [];
          const price = foundProduct.price || "N/A";

          return {
            message: `Evet! ${foundProduct.name} koleksiyonumuzda var ✨ ${
              foundProduct.brand
            } markasından. Notaları: ${notes
              .slice(0, 3)
              .join(", ")}. Fiyat: ${price} TL.`,
            recommendedProducts: [
              {
                id: foundProduct.id,
                name: foundProduct.name,
                brand: foundProduct.brand,
              },
            ],
          };
        } else {
          // Bulunamadı - nota bazlı benzer ürünler öner (MAX 2 ürün)
          const knownProfile = this.getKnownPerfumeProfile(intent.productName);

          let similarProducts: any[] = [];
          let profileDescription = "";

          if (knownProfile) {
            // Bilinen parfüm profili varsa, ona göre benzer bul
            similarProducts = await this.findSimilarByProfile(knownProfile);
            profileDescription = knownProfile.description;
          } else {
            // Bilinmeyen parfüm - popüler ürünlerden seç (nota ve özellik bilgisiyle)
            const popularProducts = await Product.find({ status: "active" })
              .sort({ price: -1 })
              .limit(10)
              .lean();
            similarProducts = popularProducts.slice(0, 2); // MAX 2 ürün
          }

          // MAX 2 ürünle sınırla
          similarProducts = similarProducts.slice(0, 2);

          if (similarProducts.length > 0) {
            // Her ürün için detaylı bilgi göster (nota + özellik)
            const suggestions = similarProducts
              .map((p) => {
                const notes = Array.isArray(p.notes) ? p.notes : [];
                const chars = Array.isArray(p.characteristics)
                  ? p.characteristics
                  : [];
                const matchedNotes =
                  p.matchedNotes?.slice(0, 3) || notes.slice(0, 3);

                const notesText =
                  matchedNotes.length > 0
                    ? `Notalar: ${matchedNotes.join(", ")}`
                    : "";
                const charsText =
                  chars.length > 0
                    ? `Özellikler: ${chars.slice(0, 3).join(", ")}`
                    : "";

                return `• ${p.name}\n  ${notesText}\n  ${charsText}`;
              })
              .join("\n\n");

            const profileText = knownProfile
              ? `\n\n${knownProfile.name}: ${profileDescription}`
              : "";

            return {
              message: `"${intent.productName}" koleksiyonumuzda yok 😔${profileText}\n\nSana benzer önerilerim:\n\n${suggestions}`,
              recommendedProducts: similarProducts.map((p) => ({
                id: p.id,
                name: p.name,
                brand: p.brand,
              })),
            };
          }
        }
      }

      // 6. Mevsim/cinsiyet bazlı öneri
      if (intent.isRecommendationRequest && (intent.season || intent.gender)) {
        const filteredProducts = await this.filterProductsByCriteria(
          intent.season,
          intent.gender,
          5
        );

        if (filteredProducts.length > 0) {
          // Rastgele 2-3 ürün seç
          const shuffled = filteredProducts.sort(() => 0.5 - Math.random());
          const recommendations = shuffled.slice(0, 3);

          const recText = recommendations
            .map((p) => {
              const notes = Array.isArray(p.notes) ? p.notes : [];
              return `• ${p.name} (${p.brand})`;
            })
            .join("\n");

          const seasonText = intent.season ? `${intent.season} için ` : "";
          const genderText = intent.gender ? `${intent.gender} ` : "";

          return {
            message: `${seasonText}${genderText}için önerilerim: ✨\n\n${recText}`,
            recommendedProducts: recommendations.map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand,
            })),
          };
        }
      }

      // 7. Genel öneri isteği (mevsim/cinsiyet belirtilmemiş)
      if (intent.isRecommendationRequest) {
        // Popüler/çeşitli ürünler öner
        const randomProducts = await Product.find({ status: "active" })
          .limit(20)
          .lean();

        const shuffled = randomProducts.sort(() => 0.5 - Math.random());
        const recommendations = shuffled.slice(0, 3);

        const recText = recommendations
          .map((p) => `• ${p.name} (${p.brand})`)
          .join("\n");

        return {
          message: `Sana özel önerilerim: ✨\n\n${recText}`,
          recommendedProducts: recommendations.map((p) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
          })),
        };
      }

      // 8. Kısa cevaplar ve satın alma istekleri
      const purchaseKeywords = [
        "alayım",
        "al",
        "satın al",
        "alabilir miyim",
        "işte",
        "bu",
        "şunu",
      ];
      const isPurchaseRequest = purchaseKeywords.some((keyword) =>
        question.toLowerCase().includes(keyword)
      );

      if (isPurchaseRequest && intent.productName) {
        // Ürün ismi varsa direkt göster
        const searchResults = await this.searchProductsInDB(intent.productName);
        if (searchResults.length > 0) {
          const product = searchResults[0];
          return {
            message: `Harika seçim! ${product.name} için detay sayfasına bakabilirsin ✨`,
            recommendedProducts: [
              {
                id: product.id,
                name: product.name,
                brand: product.brand,
              },
            ],
          };
        }
      }

      // 9. "Benzeri", "aç", "detay" gibi takip soruları - proaktif öneri yap
      const followUpKeywords = [
        "benzeri",
        "benzer",
        "aç",
        "açar",
        "detay",
        "hangisi",
        "fark",
      ];
      const isFollowUp = followUpKeywords.some((keyword) =>
        question.toLowerCase().includes(keyword)
      );

      if (isFollowUp) {
        // Erkek parfümü öner (varsayılan - daha güvenli)
        const maleProducts = await Product.find({
          status: "active",
          $or: [{ gender: "male" }, { gender: "unisex" }],
        })
          .limit(10)
          .lean();

        if (maleProducts.length > 0) {
          const shuffled = maleProducts.sort(() => 0.5 - Math.random());
          const product = shuffled[0];
          const notes = Array.isArray(product.notes) ? product.notes : [];

          return {
            message: `${product.name} önerebilirim! ${notes
              .slice(0, 2)
              .join(" ve ")} notalarıyla ferah bir koku ✨`,
            recommendedProducts: [
              {
                id: product.id,
                name: product.name,
                brand: product.brand,
              },
            ],
          };
        }
      }

      // 10. Genel soru - AI ile yanıtla (son çare)
      const allPerfumes = await Product.find({ status: "active" })
        .limit(20)
        .select("name notes gender price characteristics")
        .lean();

      // Sadece erkek ve unisex parfümleri listele (daha tutarlı olması için)
      const filteredPerfumes = allPerfumes.filter(
        (p) => p.gender === "male" || p.gender === "unisex"
      );

      const perfumeList = filteredPerfumes
        .map((p) => {
          const notes = Array.isArray(p.notes) ? p.notes : [];
          const noteStr = notes.length > 0 ? notes.slice(0, 2).join(", ") : "";
          return `- ${p.name}: ${noteStr}`;
        })
        .join("\n");

      const context = `
Mevcut Erkek/Unisex Parfümler:
${perfumeList}

KESİN KURALLAR:
- MAX 60 KARAKTER! Çok kısa ol.
- SADECE listeden öneri yap
- Kadın parfümü önerme (Delina, Kirke vb. yasak)
- 1 emoji yeter
- Parfüm adı + 1-2 nota yaz, başka açıklama yapma
`;

      const prompt = `Sen "Mira" - Blue Perfumery'nin samimi parfüm danışmanı.

${context}

Müşteri: ${question}

Mira (MAX 60 KARAKTER, sadece erkek/unisex parfüm öner, samimi ol):`;

      const response = await this.client!.messages.create({
        model: this.model,
        max_tokens: 100, // Harf sınırı için token limiti düşürüldü
        messages: [{ role: "user", content: prompt }],
      });

      if (!response.content || response.content.length === 0) {
        return { message: "Üzgünüm, şu an yanıt veremiyorum." };
      }

      const content = response.content[0];
      if (content.type !== "text") {
        return { message: "Üzgünüm, şu an yanıt veremiyorum." };
      }

      return { message: content.text };
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
