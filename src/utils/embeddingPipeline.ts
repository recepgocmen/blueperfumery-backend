/**
 * Embedding Pipeline
 *
 * Ürün verilerini embedding'e çevirir ve MongoDB'ye kaydeder.
 * Voyage AI (Anthropic önerisi) kullanarak gerçek vektör embedding oluşturur.
 *
 * Kullanım: npx ts-node src/utils/embeddingPipeline.ts
 */

import dotenv from "dotenv";

// dotenv'i en başta yükle
dotenv.config();

import mongoose from "mongoose";
import { VoyageAIClient } from "voyageai";
import { Product } from "../models/Product";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/blueperfumery";

// Voyage AI Client (lazy initialization)
let voyageClient: VoyageAIClient | null = null;

/**
 * VOYAGE_API_KEY'i dinamik olarak al
 */
function getVoyageApiKey(): string | undefined {
  return process.env.VOYAGE_API_KEY;
}

/**
 * Voyage AI client'ını başlat
 */
function getVoyageClient(): VoyageAIClient {
  if (!voyageClient) {
    const apiKey = getVoyageApiKey();
    if (!apiKey) {
      throw new Error("VOYAGE_API_KEY bulunamadı! .env dosyasına ekleyin.");
    }
    voyageClient = new VoyageAIClient({ apiKey });
  }
  return voyageClient;
}

/**
 * Ürün bilgilerini zengin metin formatına çevirir
 * Bu metin embedding için kullanılır
 */
function createProductText(product: any): string {
  const parts: string[] = [];

  // Temel bilgiler
  parts.push(`${product.name} - ${product.brand}`);

  // Cinsiyet
  const genderMap: Record<string, string> = {
    male: "erkek parfümü",
    female: "kadın parfümü",
    unisex: "unisex parfüm",
  };
  parts.push(genderMap[product.gender] || product.gender);

  // Kategori
  const categoryMap: Record<string, string> = {
    woman: "kadın koleksiyonu",
    man: "erkek koleksiyonu",
    unisex: "unisex koleksiyon",
    niches: "niş parfüm",
    urban: "urban şehir parfümü",
    classic: "klasik parfüm",
    luxury: "lüks parfüm",
    premium: "premium parfüm",
    exclusive: "özel seri",
    artisanal: "artisanal parfüm",
  };
  parts.push(categoryMap[product.category] || product.category);

  // Notalar
  if (product.notes && product.notes.length > 0) {
    parts.push(`Notalar: ${product.notes.join(", ")}`);
  }

  // Karakteristikler
  if (product.characteristics && product.characteristics.length > 0) {
    parts.push(`Özellikler: ${product.characteristics.join(", ")}`);
  }

  // Yaş aralığı
  if (product.ageRange) {
    parts.push(`${product.ageRange.min}-${product.ageRange.max} yaş arası`);
  }

  // Açıklama
  if (product.description) {
    parts.push(product.description);
  }

  // Fiyat bilgisi
  parts.push(`${product.ml}ml ${product.price} TL`);

  return parts.join(". ");
}

/**
 * Voyage AI ile gerçek embedding oluşturur
 * Model: voyage-3-lite (512 boyut, Türkçe destekli, en ucuz)
 */
async function createVoyageEmbedding(text: string): Promise<number[]> {
  const client = getVoyageClient();

  const result = await client.embed({
    input: text,
    model: "voyage-3-lite", // 512 boyut, çok ucuz, Türkçe iyi
  });

  if (!result.data || result.data.length === 0 || !result.data[0].embedding) {
    throw new Error("Voyage AI embedding oluşturulamadı");
  }

  return result.data[0].embedding as number[];
}

/**
 * Birden fazla metin için toplu embedding oluşturur (daha verimli)
 */
async function createBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getVoyageClient();

  const result = await client.embed({
    input: texts,
    model: "voyage-3-lite",
  });

  if (!result.data || result.data.length === 0) {
    throw new Error("Voyage AI batch embedding oluşturulamadı");
  }

  return result.data.map((d) => {
    if (!d.embedding) {
      throw new Error("Voyage AI embedding verisi eksik");
    }
    return d.embedding as number[];
  });
}

/**
 * Basit bir text-based "embedding" oluşturur (Voyage API yoksa fallback)
 */
function createSimpleEmbedding(text: string): number[] {
  // Türkçe için önemli parfüm terimleri
  const keywords = [
    // Notalar
    "vanilya",
    "misk",
    "amber",
    "oud",
    "gül",
    "yasemin",
    "lavanta",
    "bergamot",
    "sandal",
    "sedir",
    "vetiver",
    "patchouli",
    "karabiber",
    "zencefil",
    "tarçın",
    "kakao",
    "kahve",
    "deri",
    "tütün",
    "bal",
    "karamel",
    "çilek",
    "şeftali",
    "portakal",
    "limon",
    "greyfurt",
    "elma",
    "armut",
    "hindistan cevizi",
    "badem",
    // Karakteristikler
    "taze",
    "ferah",
    "odunsu",
    "çiçeksi",
    "meyveli",
    "baharatlı",
    "tatlı",
    "sıcak",
    "soğuk",
    "hafif",
    "yoğun",
    "kalıcı",
    "romantik",
    "seksi",
    "zarif",
    "sofistike",
    "dinamik",
    "enerjik",
    "sakin",
    "gizemli",
    // Kullanım
    "günlük",
    "gece",
    "özel",
    "iş",
    "spor",
    "yaz",
    "kış",
    "ilkbahar",
    "sonbahar",
    // Cinsiyet
    "erkek",
    "kadın",
    "unisex",
    // Kategori
    "niş",
    "lüks",
    "premium",
    "klasik",
    "modern",
  ];

  const lowerText = text.toLowerCase();
  const embedding: number[] = [];

  for (const keyword of keywords) {
    const count = (lowerText.match(new RegExp(keyword, "g")) || []).length;
    embedding.push(Math.min(count / 3, 1));
  }

  return embedding;
}

/**
 * Tüm ürünlerin embedding'lerini oluşturur ve kaydeder
 */
async function generateAllEmbeddings(): Promise<void> {
  console.log("🔗 MongoDB'ye bağlanılıyor...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ MongoDB bağlantısı başarılı");

  const useVoyageAI = !!getVoyageApiKey();

  if (useVoyageAI) {
    console.log("🚀 Voyage AI kullanılıyor (gerçek vektör embedding)");
  } else {
    console.log(
      "⚠️  VOYAGE_API_KEY bulunamadı, basit keyword embedding kullanılıyor"
    );
  }

  try {
    // Tüm aktif ürünleri çek
    const products = await Product.find({ status: "active" });
    console.log(`📦 ${products.length} ürün bulundu`);

    let updated = 0;
    let skipped = 0;
    const batchSize = 10; // Voyage AI için batch işlem

    if (useVoyageAI) {
      // Voyage AI ile batch processing
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const textsToProcess: { product: any; text: string }[] = [];

        for (const product of batch) {
          const productText = createProductText(product);

          // Eğer metin değişmemişse atla
          if (
            product.embeddingText === productText &&
            product.embedding &&
            product.embedding.length === 512
          ) {
            skipped++;
            continue;
          }

          textsToProcess.push({ product, text: productText });
        }

        if (textsToProcess.length === 0) continue;

        try {
          // Batch embedding oluştur
          const embeddings = await createBatchEmbeddings(
            textsToProcess.map((t) => t.text)
          );

          // Kaydet
          for (let j = 0; j < textsToProcess.length; j++) {
            const { product, text } = textsToProcess[j];
            const embedding = embeddings[j];

            await Product.updateOne(
              { _id: product._id },
              {
                $set: {
                  embedding: embedding,
                  embeddingText: text,
                },
              }
            );

            updated++;
            console.log(
              `✅ ${product.name} - Voyage AI embedding oluşturuldu (${embedding.length} boyut)`
            );
          }
        } catch (error: any) {
          console.error(`❌ Batch embedding hatası:`, error.message);
          // Fallback: tek tek dene
          for (const { product, text } of textsToProcess) {
            try {
              const embedding = await createVoyageEmbedding(text);
              await Product.updateOne(
                { _id: product._id },
                { $set: { embedding, embeddingText: text } }
              );
              updated++;
              console.log(`✅ ${product.name} - embedding oluşturuldu (retry)`);
            } catch (retryError: any) {
              console.error(`❌ ${product.name} - hata: ${retryError.message}`);
            }
          }
        }

        // Rate limiting için kısa bekleme
        if (i + batchSize < products.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } else {
      // Basit embedding (API key yoksa)
      for (const product of products) {
        const productText = createProductText(product);

        if (product.embeddingText === productText && product.embedding) {
          skipped++;
          continue;
        }

        const embedding = createSimpleEmbedding(productText);

        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              embedding: embedding,
              embeddingText: productText,
            },
          }
        );

        updated++;
        console.log(`✅ ${product.name} - basit embedding oluşturuldu`);
      }
    }

    console.log("\n📊 Özet:");
    console.log(`   Güncellenen: ${updated}`);
    console.log(`   Atlanan: ${skipped}`);
    console.log(`   Toplam: ${products.length}`);
    console.log(
      `   Embedding tipi: ${
        useVoyageAI ? "Voyage AI (512 boyut)" : "Basit keyword (70 boyut)"
      }`
    );
  } catch (error) {
    console.error("❌ Hata:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB bağlantısı kapatıldı");
  }
}

/**
 * MongoDB Vector Search index oluşturma talimatları
 */
function printVectorSearchInstructions(): void {
  const dimensions = getVoyageApiKey() ? 512 : 70;

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           MongoDB Atlas Vector Search Index Oluşturma            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  MongoDB Atlas Console'da şu adımları izleyin:                   ║
║                                                                  ║
║  1. Atlas Console > Database > Browse Collections                ║
║  2. "products" collection'ını seçin                              ║
║  3. "Search Indexes" tab'ına gidin                               ║
║  4. "Create Search Index" butonuna tıklayın                      ║
║  5. "JSON Editor" seçin ve şu yapılandırmayı girin:              ║
║                                                                  ║
║  {                                                               ║
║    "mappings": {                                                 ║
║      "dynamic": true,                                            ║
║      "fields": {                                                 ║
║        "embedding": {                                            ║
║          "type": "knnVector",                                    ║
║          "dimensions": ${dimensions},                                       ║
║          "similarity": "cosine"                                  ║
║        }                                                         ║
║      }                                                           ║
║    }                                                             ║
║  }                                                               ║
║                                                                  ║
║  6. Index adını "product_vector_index" olarak belirleyin         ║
║  7. "Create Search Index" butonuna tıklayın                      ║
║                                                                  ║
║  NOT: Embedding boyutu: ${dimensions} (${
    getVoyageApiKey() ? "Voyage AI" : "Basit keyword"
  })              ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

// CLI
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Kullanım: npx ts-node src/utils/embeddingPipeline.ts [options]

Options:
  --generate      Tüm ürünler için embedding oluştur
  --instructions  MongoDB Vector Search index oluşturma talimatları
  --help, -h      Bu yardım mesajını göster

Environment:
  VOYAGE_API_KEY  Voyage AI API anahtarı (opsiyonel, yoksa basit embedding kullanılır)
`);
    return;
  }

  if (args.includes("--instructions")) {
    printVectorSearchInstructions();
    return;
  }

  if (args.includes("--generate") || args.length === 0) {
    await generateAllEmbeddings();
    console.log("\n");
    printVectorSearchInstructions();
  }
}

// Sadece doğrudan script olarak çalıştırıldığında main() çağır
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in other modules
export {
  createProductText,
  createSimpleEmbedding,
  createVoyageEmbedding,
  createBatchEmbeddings,
  generateAllEmbeddings,
  getVoyageClient,
  getVoyageApiKey,
};
