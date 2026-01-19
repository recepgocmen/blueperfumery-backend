/**
 * Query Router - Soru Sınıflandırıcı
 *
 * Kullanıcı mesajını analiz eder ve hangi model ile
 * cevaplanması gerektiğine karar verir.
 *
 * - simple: Haiku (hızlı, ucuz) - VARSAYILAN
 * - complex: Sonnet + Tools (güçlü, pahalı) - SADECE ÇOK ÖZEL DURUMLAR
 *
 * MALİYET OPTİMİZASYONU: Haiku ağırlıklı hibrit sistem
 * Sonnet sadece aşağıdaki durumlarda kullanılır:
 * 1. Açık karşılaştırma soruları ("hangisi daha iyi", "X mi Y mi")
 * 2. Tool kullanımı gerektiren çoklu kriter sorguları
 */

export type QueryComplexity = "simple" | "complex";

export interface QueryAnalysis {
  complexity: QueryComplexity;
  reason: string;
  suggestedTools?: string[];
  confidence: number; // 0-1 arası
}

// Basit soru kalıpları (Haiku ile cevaplanacak)
const SIMPLE_PATTERNS = {
  // Selamlamalar
  greetings: [
    /^(merhaba|selam|hey|hi|hello|günaydın|iyi akşamlar|iyi günler)/i,
    /nasılsın/i,
    /^(sa|as|selamun aleyküm)/i,
  ],

  // Teşekkür/Vedalaşma
  thanks: [
    /^(teşekkür|sağol|eyvallah|thanks|mersi)/i,
    /^(görüşürüz|bye|hoşçakal|iyi günler)/i,
  ],

  // Basit evet/hayır soruları - dikkat: karşılaştırma sorularını yakalamamalı
  yesNo: [
    /^(evet|hayır|olur|olmaz|tamam|ok)/i,
    /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+\s+var\s+mı\?*$/i, // "X var mı?" - karşılaştırma değil
    /stokta mı\?*$/i,
  ],

  // Tek kelimelik yanıtlar
  singleWord: [/^[a-zA-ZğüşıöçĞÜŞİÖÇ]{1,15}$/i],

  // Fiyat soruları (basit)
  simplePrice: [/^fiyat[ıi]? (ne|kaç)/i, /^ne kadar\?*$/i, /^kaç (tl|lira)/i],
};

// Karmaşık soru kalıpları (Sonnet + Tools ile cevaplanacak)
const COMPLEX_PATTERNS = {
  // Çoklu kriter içeren öneriler
  multiCriteria: [
    /için.*(parfüm|koku).*öner/i,
    /(erkek|kadın).*(yaz|kış|ilkbahar|sonbahar)/i,
    /hem.*hem/i,
    /ama.*olmasın/i,
    /hariç/i,
    /dışında/i,
  ],

  // Karşılaştırma istekleri
  comparison: [
    /\w+\s+(mı|mi|mu|mü)\s+\w+\s+(mı|mi|mu|mü)/i, // "A mı B mi" pattern
    /(mı|mi|mu|mü)\s+(yoksa|veya)/i,
    /hangisi (daha|iyi|uygun)/i,
    /arasındaki fark/i,
    /karşılaştır/i,
    /vs\.?/i,
    /\w+\s+mı\s+.*\s+mı/i, // İki "mı" içeren
  ],

  // Detaylı öneri istekleri
  recommendation: [
    /bana (uygun|yakışır|yakışan)/i,
    /öner(ir misin|ebilir misin|sen)/i,
    /ne (almalıyım|alsam|önerirsin)/i,
    /tavsiye/i,
    /benim için/i,
    /tarzıma uygun/i,
  ],

  // Detaylı analiz istekleri
  analysis: [
    /notaları (ne|neler)/i,
    /özellikleri/i,
    /detay/i,
    /hakkında bilgi/i,
    /anlat/i,
    /açıkla/i,
    /nasıl bir koku/i,
  ],

  // Bütçe/fiyat bazlı filtreleme
  budgetFilter: [
    /\d+\s*(tl|lira)\s*(altı|altında|üstü|üstünde|arası|arasında)/i,
    /bütçe/i,
    /ucuz/i,
    /pahalı olmayan/i,
    /uygun fiyat/i,
  ],

  // Hediye önerileri
  gift: [/hediye/i, /sevgilime/i, /arkadaşıma/i, /anneme|babama/i, /için al/i],

  // Mevsim/ortam bazlı
  contextual: [
    /(yaz|kış|ilkbahar|sonbahar)\s*(için|ayları)/i,
    /(gece|gündüz|iş|ofis|spor|özel gün)/i,
    /düğün/i,
    /toplantı/i,
  ],
};

// Soru uzunluğu eşiği - YÜKSELTILDI (maliyet optimizasyonu)
const COMPLEXITY_LENGTH_THRESHOLD = 100; // 50'den 100'e çıkarıldı

// Anahtar kelime sayısı eşiği - YÜKSELTILDI (maliyet optimizasyonu)
const KEYWORD_COUNT_THRESHOLD = 5; // 3'ten 5'e çıkarıldı

// Karmaşık pattern eşleşme eşiği - EN AZ 2 PATTERN EŞLEŞMELİ
const COMPLEX_PATTERN_THRESHOLD = 2; // Yeni: Tek eşleşme yetmez

/**
 * Mesajı analiz et ve complexity belirle
 */
export function analyzeQuery(message: string): QueryAnalysis {
  const normalizedMessage = message.toLowerCase().trim();

  // 1. ÖNCELİKLİ: Karşılaştırma kontrolü - "X mı Y mı" pattern
  // Bu pattern basit sorulardan önce kontrol edilmeli
  if (/\w+\s+(mı|mi|mu|mü)\s+.*\s+(mı|mi|mu|mü)/i.test(normalizedMessage)) {
    return {
      complexity: "complex",
      reason: "Karşılaştırma sorusu",
      suggestedTools: ["get_perfume_details", "search_perfumes"],
      confidence: 0.9,
    };
  }

  // 2. Çok kısa mesajlar genellikle basit
  if (normalizedMessage.length < 15) {
    // Ama "öner" gibi kelimeler varsa complex olabilir
    if (/öner|tavsiye/i.test(normalizedMessage)) {
      return {
        complexity: "complex",
        reason: "Kısa ama öneri isteği içeriyor",
        suggestedTools: ["recommend_perfumes"],
        confidence: 0.7,
      };
    }

    return {
      complexity: "simple",
      reason: "Çok kısa mesaj",
      confidence: 0.9,
    };
  }

  // 3. Basit kalıplara bak
  for (const [category, patterns] of Object.entries(SIMPLE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedMessage)) {
        return {
          complexity: "simple",
          reason: `Basit ${category} kalıbı`,
          confidence: 0.95,
        };
      }
    }
  }

  // 5. Karmaşık kalıplara bak
  const suggestedTools: string[] = [];
  let complexMatches = 0;

  for (const [category, patterns] of Object.entries(COMPLEX_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedMessage)) {
        complexMatches++;

        // Kategori bazlı tool önerileri
        if (category === "recommendation" || category === "multiCriteria") {
          suggestedTools.push("recommend_perfumes");
        }
        if (category === "comparison" || category === "analysis") {
          suggestedTools.push("get_perfume_details");
        }
        if (category === "budgetFilter") {
          suggestedTools.push("search_perfumes");
        }
      }
    }
  }

  // MALİYET OPTİMİZASYONU: En az 2 karmaşık pattern eşleşmeli
  if (complexMatches >= COMPLEX_PATTERN_THRESHOLD) {
    return {
      complexity: "complex",
      reason: `${complexMatches} karmaşık kalıp eşleşti (eşik: ${COMPLEX_PATTERN_THRESHOLD})`,
      suggestedTools: [...new Set(suggestedTools)],
      confidence: Math.min(0.5 + complexMatches * 0.15, 0.95),
    };
  }

  // Tek eşleşme varsa - Haiku ile dene (maliyet optimizasyonu)
  if (complexMatches === 1) {
    return {
      complexity: "simple",
      reason: "Tek karmaşık kalıp - Haiku ile denenecek",
      confidence: 0.7,
    };
  }

  // 4. Mesaj uzunluğu kontrolü
  if (normalizedMessage.length > COMPLEXITY_LENGTH_THRESHOLD) {
    // Uzun mesajlarda anahtar kelime sayısına bak
    const keywords = extractKeywords(normalizedMessage);
    if (keywords.length >= KEYWORD_COUNT_THRESHOLD) {
      return {
        complexity: "complex",
        reason: "Uzun mesaj, çok anahtar kelime",
        suggestedTools: ["search_perfumes"],
        confidence: 0.7,
      };
    }
  }

  // 5. Varsayılan: Emin değilsek basit kabul et (maliyet optimizasyonu)
  return {
    complexity: "simple",
    reason: "Varsayılan - belirgin karmaşıklık yok",
    confidence: 0.6,
  };
}

/**
 * Mesajdan anahtar kelimeleri çıkar
 */
function extractKeywords(message: string): string[] {
  const keywords: string[] = [];

  // Parfüm ile ilgili anahtar kelimeler
  const perfumeKeywords = [
    "parfüm",
    "koku",
    "nota",
    "vanilya",
    "oud",
    "misk",
    "çiçeksi",
    "odunsu",
    "taze",
    "baharatlı",
    "tatlı",
    "ferah",
    "erkek",
    "kadın",
    "unisex",
    "yaz",
    "kış",
    "gece",
    "gündüz",
    "günlük",
    "özel",
    "kalıcı",
    "hafif",
    "yoğun",
    "hediye",
    "öner",
    "tavsiye",
  ];

  for (const keyword of perfumeKeywords) {
    if (message.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  return keywords;
}

/**
 * Basit bir complexity check - hızlı karar için
 */
export function isComplexQuery(message: string): boolean {
  return analyzeQuery(message).complexity === "complex";
}

/**
 * Conversation history'ye göre complexity ayarla
 * MALİYET OPTİMİZASYONU: Artık conversation length complex'e etki etmiyor
 * Sadece açık karşılaştırma soruları Sonnet'e gidiyor
 */
export function analyzeWithContext(
  message: string,
  conversationLength: number
): QueryAnalysis {
  const baseAnalysis = analyzeQuery(message);

  // MALİYET OPTİMİZASYONU: Conversation length artık complex'e yükseltmiyor
  // Sadece açık "hangisi" veya karşılaştırma soruları Sonnet kullanır
  // Bu sayede çoğu soru Haiku ile cevaplanır

  // Sadece çok güçlü karşılaştırma ipuçları varsa Sonnet'e yükselt
  const strongComparisonPatterns = [
    /hangisi (daha|en) (iyi|uygun|güzel)/i,
    /\w+\s+(mı|mi|mu|mü)\s+.*\s+(mı|mi|mu|mü)\s+.*tercih/i,
    /karşılaştır/i,
    /arasındaki fark nedir/i,
  ];

  const hasStrongComparison = strongComparisonPatterns.some((p) =>
    p.test(message)
  );

  if (hasStrongComparison && baseAnalysis.complexity === "simple") {
    return {
      ...baseAnalysis,
      complexity: "complex",
      reason: "Güçlü karşılaştırma sorusu tespit edildi",
      confidence: 0.9,
    };
  }

  return baseAnalysis;
}
