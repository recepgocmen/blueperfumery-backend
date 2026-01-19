/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * Ürün veritabanından semantik arama yapar ve
 * Claude'a zengin context sağlar.
 *
 * Voyage AI embedding'leri ile gerçek semantik arama yapar.
 */

import { Product } from "../models/Product";
import {
  createProductText,
  createSimpleEmbedding,
  createVoyageEmbedding,
  getVoyageApiKey,
} from "../utils/embeddingPipeline";

export interface RetrievedProduct {
  id: string;
  name: string;
  brand: string;
  description: string;
  notes: string[];
  characteristics: string[];
  gender: string;
  category: string;
  price: number;
  ml: number;
  ageRange: { min: number; max: number };
  shopierLink?: string;
  score: number; // Relevance score
}

export interface RAGContext {
  products: RetrievedProduct[];
  totalFound: number;
  query: string;
  contextText: string;
}

/**
 * Cosine similarity hesaplar
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Query için embedding oluşturur (Voyage AI veya basit)
 */
async function getQueryEmbedding(query: string): Promise<number[]> {
  if (getVoyageApiKey()) {
    try {
      return await createVoyageEmbedding(query);
    } catch (error) {
      console.warn("Voyage AI hatası, basit embedding'e düşülüyor:", error);
      return createSimpleEmbedding(query.toLowerCase());
    }
  }
  return createSimpleEmbedding(query.toLowerCase());
}

/**
 * Kullanıcı sorgusuna göre en alakalı ürünleri bulur
 */
export async function retrieveRelevantProducts(
  query: string,
  limit: number = 5,
  filters?: {
    gender?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
  }
): Promise<RAGContext> {
  // 1. Query embedding oluştur
  const queryEmbedding = await getQueryEmbedding(query.toLowerCase());

  // 2. Filtre oluştur
  const mongoFilter: any = { status: "active" };

  if (filters?.gender) {
    mongoFilter.gender = filters.gender;
  }
  if (filters?.category) {
    mongoFilter.category = filters.category;
  }
  if (filters?.minPrice || filters?.maxPrice) {
    mongoFilter.price = {};
    if (filters.minPrice) mongoFilter.price.$gte = filters.minPrice;
    if (filters.maxPrice) mongoFilter.price.$lte = filters.maxPrice;
  }

  // 3. Tüm ürünleri çek (embedding olanlar)
  // Embedding boyutunu kontrol et (512 = Voyage AI, 70 = basit)
  const expectedDimension = getVoyageApiKey() ? 512 : 70;

  const products = await Product.find({
    ...mongoFilter,
    embedding: { $exists: true, $ne: null },
  }).lean();

  // 4. Sadece aynı boyuttaki embedding'lerle karşılaştır
  const compatibleProducts = products.filter(
    (p: any) => p.embedding && p.embedding.length === queryEmbedding.length
  );

  // 5. Similarity hesapla ve sırala
  const scoredProducts = compatibleProducts
    .map((product: any) => {
      const similarity = cosineSimilarity(
        queryEmbedding,
        product.embedding || []
      );

      // Text match bonus
      const queryLower = query.toLowerCase();
      let textBonus = 0;

      if (product.name.toLowerCase().includes(queryLower)) textBonus += 0.3;
      if (product.brand.toLowerCase().includes(queryLower)) textBonus += 0.2;
      if (
        product.notes?.some((n: string) => n.toLowerCase().includes(queryLower))
      )
        textBonus += 0.2;
      if (
        product.characteristics?.some((c: string) =>
          c.toLowerCase().includes(queryLower)
        )
      )
        textBonus += 0.1;

      return {
        product,
        score: similarity + textBonus,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // 6. Sonuçları formatla
  const retrievedProducts: RetrievedProduct[] = scoredProducts.map(
    ({ product, score }) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      description: product.description,
      notes: product.notes || [],
      characteristics: product.characteristics || [],
      gender: product.gender,
      category: product.category,
      price: product.price,
      ml: product.ml,
      ageRange: product.ageRange,
      shopierLink: product.shopierLink,
      score: Math.round(score * 100) / 100,
    })
  );

  // 7. Context text oluştur
  const contextText = retrievedProducts
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} (${p.brand})
   - Cinsiyet: ${
     p.gender === "male" ? "Erkek" : p.gender === "female" ? "Kadın" : "Unisex"
   }
   - Notalar: ${p.notes.length > 0 ? p.notes.join(", ") : "Belirtilmemiş"}
   - Özellikler: ${
     p.characteristics.length > 0
       ? p.characteristics.join(", ")
       : "Belirtilmemiş"
   }
   - Fiyat: ${p.price} TL (${p.ml}ml)
   - Yaş Aralığı: ${p.ageRange.min}-${p.ageRange.max}
   - Açıklama: ${p.description}`
    )
    .join("\n\n");

  return {
    products: retrievedProducts,
    totalFound: compatibleProducts.length,
    query,
    contextText,
  };
}

/**
 * Kullanıcı profiline göre ürün önerir
 */
export async function recommendByProfile(profile: {
  gender?: string;
  season?: string;
  occasion?: string;
  personality?: string;
  preferredNotes?: string[];
  intensity?: string;
  ageGroup?: string;
}): Promise<RAGContext> {
  // Profilden query oluştur
  const queryParts: string[] = [];

  if (profile.gender) {
    const genderMap: Record<string, string> = {
      erkek: "erkek",
      kadın: "kadın",
      unisex: "unisex",
    };
    queryParts.push(genderMap[profile.gender] || profile.gender);
  }

  if (profile.season) {
    const seasonMap: Record<string, string> = {
      yaz: "taze ferah hafif",
      kış: "sıcak yoğun odunsu",
      ilkbahar: "çiçeksi taze",
      sonbahar: "odunsu baharatlı",
    };
    queryParts.push(seasonMap[profile.season] || profile.season);
  }

  if (profile.occasion) {
    const occasionMap: Record<string, string> = {
      günlük: "günlük hafif",
      iş: "profesyonel sofistike",
      gece: "seksi yoğun kalıcı",
      özel: "özel romantik",
    };
    queryParts.push(occasionMap[profile.occasion] || profile.occasion);
  }

  if (profile.personality) {
    queryParts.push(profile.personality);
  }

  if (profile.preferredNotes && profile.preferredNotes.length > 0) {
    queryParts.push(profile.preferredNotes.join(" "));
  }

  if (profile.intensity) {
    queryParts.push(profile.intensity);
  }

  const query = queryParts.join(" ");

  // Gender filtresi
  let genderFilter: string | undefined;
  if (profile.gender === "erkek") genderFilter = "male";
  else if (profile.gender === "kadın") genderFilter = "female";

  return retrieveRelevantProducts(query, 5, { gender: genderFilter });
}

/**
 * Belirli bir parfüme benzer ürünleri bulur
 */
export async function findSimilarProducts(
  productId: string,
  limit: number = 3
): Promise<RAGContext> {
  // Kaynak ürünü bul
  const sourceProduct = await Product.findOne({ id: productId }).lean();

  if (!sourceProduct) {
    return {
      products: [],
      totalFound: 0,
      query: productId,
      contextText: "Ürün bulunamadı.",
    };
  }

  // Kaynak ürünün text'ini query olarak kullan
  const query = createProductText(sourceProduct);

  // Kendisi hariç benzer ürünleri bul
  const result = await retrieveRelevantProducts(query, limit + 1, {
    gender: sourceProduct.gender,
  });

  // Kendisini çıkar
  result.products = result.products.filter((p) => p.id !== productId);
  result.products = result.products.slice(0, limit);

  return result;
}

/**
 * Keyword-based hızlı arama
 */
export async function quickSearch(keyword: string): Promise<RAGContext> {
  const products = await Product.find({
    status: "active",
    $or: [
      { name: { $regex: keyword, $options: "i" } },
      { brand: { $regex: keyword, $options: "i" } },
      { notes: { $regex: keyword, $options: "i" } },
      { characteristics: { $regex: keyword, $options: "i" } },
    ],
  })
    .limit(5)
    .lean();

  const retrievedProducts: RetrievedProduct[] = products.map(
    (product: any) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      description: product.description,
      notes: product.notes || [],
      characteristics: product.characteristics || [],
      gender: product.gender,
      category: product.category,
      price: product.price,
      ml: product.ml,
      ageRange: product.ageRange,
      shopierLink: product.shopierLink,
      score: 1,
    })
  );

  const contextText = retrievedProducts
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} (${p.brand}) - ${p.notes.join(", ")} - ${
          p.price
        } TL`
    )
    .join("\n");

  return {
    products: retrievedProducts,
    totalFound: products.length,
    query: keyword,
    contextText,
  };
}
