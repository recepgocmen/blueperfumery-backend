/**
 * Yeni Parfüm Ekleme Script'i
 * 
 * Mevcut veritabanına yeni parfümleri ekler (mevcut ürünleri silmez)
 * Çalıştırmak için: npx ts-node src/utils/addNewPerfumes.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Product } from "../models/Product";

dotenv.config();

// Yeni parfümler - Ocak 2026 koleksiyonu
const newPerfumes = [
  {
    id: "jadore-seluz",
    name: "J'adore",
    brand: "Blue Perfumery Seluz",
    price: 650,
    originalPrice: 3500,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPS-JAD-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["ylang-ylang", "şam gülü", "bergamot", "yasemin", "tuberose", "misk", "vanilya"],
    characteristics: ["çiçeksi", "zarif", "feminen", "sofistike", "ikonik"],
    ageRange: { min: 25, max: 55 },
    shopierLink: "https://www.shopier.com/blueperfumery/jadore",
    description: "Dior'un efsanevi J'adore kokusunun Blue Perfumery yorumu. Ylang-ylang ve Şam gülünün zarif dansı ile feminen ve sofistike bir deneyim.",
  },
  {
    id: "stronger-with-you-seluz",
    name: "Stronger With You",
    brand: "Blue Perfumery Seluz",
    price: 650,
    originalPrice: 2800,
    ml: 50,
    gender: "male" as const,
    category: "man" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPS-SWY-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["pembe biber", "kakule", "menekşe yaprağı", "adaçayı", "tarçın", "vanilya", "kestane", "amber"],
    characteristics: ["tatlı", "sıcak", "baharatlı", "maskülen", "çekici"],
    ageRange: { min: 20, max: 40 },
    shopierLink: "https://www.shopier.com/blueperfumery/stronger-with-you",
    description: "Emporio Armani'nin ikonik erkek kokusunun Blue Perfumery yorumu. Tatlı vanilya ve sıcak baharatların kusursuz uyumu.",
  },
  {
    id: "flora-gorgeous-seluz",
    name: "Flora Gorgeous",
    brand: "Blue Perfumery Seluz",
    price: 650,
    originalPrice: 3200,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPS-FLG-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["armut", "mandalina", "yasemin", "gardenya", "esmer şeker", "misk"],
    characteristics: ["çiçeksi", "tatlı", "ferah", "romantik", "feminen"],
    ageRange: { min: 18, max: 40 },
    shopierLink: "https://www.shopier.com/blueperfumery/flora-gorgeous",
    description: "Gucci'nin Flora Gorgeous kokusunun Blue Perfumery yorumu. Yasemin ve gardenyanın büyüleyici çiçek buketi.",
  },
  {
    id: "god-of-fire-mg",
    name: "God of Fire",
    brand: "Blue Perfumery MG",
    price: 650,
    originalPrice: 8500,
    ml: 50,
    gender: "unisex" as const,
    category: "niches" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPMG-GOF-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["safran", "pembe biber", "ud", "gül", "buhur", "deri", "amber", "sandal ağacı"],
    characteristics: ["dumanlı", "yoğun", "oryantal", "güçlü", "gizemli", "lüks"],
    ageRange: { min: 28, max: 55 },
    shopierLink: "https://www.shopier.com/blueperfumery/god-of-fire",
    description: "Morph'un efsanevi God of Fire kokusunun Blue Perfumery yorumu. Safran ve ud'un ateşli dansı ile güç ve tutku.",
  },
  {
    id: "burberry-her-seluz",
    name: "Burberry Her",
    brand: "Blue Perfumery Seluz",
    price: 650,
    originalPrice: 2900,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPS-BHR-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["çilek", "ahududu", "frenk üzümü", "menekşe", "yasemin", "misk", "amber", "kakao"],
    characteristics: ["meyveli", "tatlı", "feminen", "neşeli", "modern"],
    ageRange: { min: 18, max: 35 },
    shopierLink: "https://www.shopier.com/blueperfumery/burberry-her",
    description: "Burberry Her kokusunun Blue Perfumery yorumu. Kırmızı meyvelerin tatlı ve neşeli enerjisi.",
  },
  {
    id: "dior-sauvage-edp-seluz",
    name: "Sauvage EDP",
    brand: "Blue Perfumery Seluz",
    price: 650,
    originalPrice: 3400,
    ml: 50,
    gender: "male" as const,
    category: "man" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPS-SVG-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["bergamot", "biber", "lavanta", "sichuan biberi", "muskat", "ambroxan", "vanilya", "sedir"],
    characteristics: ["ferah", "baharatlı", "odunsu", "maskülen", "güçlü", "modern"],
    ageRange: { min: 20, max: 50 },
    shopierLink: "https://www.shopier.com/blueperfumery/sauvage-edp",
    description: "Dior Sauvage EDP'nin Blue Perfumery yorumu. Vahşi doğanın ferah ve güçlü karakteri.",
  },
  {
    id: "nishane-hacivat-seluz",
    name: "Hacivat",
    brand: "Blue Perfumery Seluz",
    price: 650,
    originalPrice: 5500,
    ml: 50,
    gender: "unisex" as const,
    category: "niches" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPS-HCV-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["ananas", "bergamot", "greyfurt", "paçuli", "gül", "meşe yosunu", "sedir", "misk"],
    characteristics: ["ferah", "odunsu", "meyveli", "sofistike", "kalıcı", "modern"],
    ageRange: { min: 22, max: 50 },
    shopierLink: "https://www.shopier.com/blueperfumery/hacivat",
    description: "Nishane Hacivat'ın Blue Perfumery yorumu. Ananas ve paçulinin unutulmaz uyumu.",
  },
  {
    id: "delina-seluz",
    name: "Delina",
    brand: "Blue Perfumery Seluz",
    price: 650,
    originalPrice: 6200,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPS-DLN-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["liçi", "ravent", "bergamot", "türk gülü", "şakayık", "müge", "misk", "vanilya", "kaşmir ağacı"],
    characteristics: ["çiçeksi", "tatlı", "romantik", "feminen", "lüks", "zarif"],
    ageRange: { min: 22, max: 45 },
    shopierLink: "https://www.shopier.com/blueperfumery/delina",
    description: "Parfums de Marly Delina'nın Blue Perfumery yorumu. Türk gülü ve liçinin romantik dansı.",
  },
  {
    id: "fleur-narcotique-seluz",
    name: "Fleur Narcotique",
    brand: "Blue Perfumery Seluz",
    price: 650,
    originalPrice: 5800,
    ml: 50,
    gender: "unisex" as const,
    category: "niches" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPS-FLN-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["bergamot", "liçi", "mısır yasemini", "şeftali çiçeği", "portakal çiçeği", "misk", "yosun", "şeftali"],
    characteristics: ["ferah", "çiçeksi", "bağımlılık yapıcı", "zarif", "modern", "unisex"],
    ageRange: { min: 22, max: 50 },
    shopierLink: "https://www.shopier.com/blueperfumery/fleur-narcotique",
    description: "Ex Nihilo Fleur Narcotique'in Blue Perfumery yorumu. Bağımlılık yapıcı derecede güzel bir çiçeksi koku.",
  },
  {
    id: "goddess-burberry",
    name: "Goddess",
    brand: "Blue Perfumery Classic",
    price: 650,
    originalPrice: 3100,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPC-GDS-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["lavanta", "zencefil", "vanilya absolü", "iris", "kakao", "misk"],
    characteristics: ["tatlı", "sıcak", "vanilyalı", "feminen", "sofistike", "gurme"],
    ageRange: { min: 25, max: 50 },
    shopierLink: "https://www.shopier.com/blueperfumery/goddess",
    description: "Burberry Goddess'in Blue Perfumery yorumu. Vanilya ve lavantanın tanrıça gibi uyumu.",
  },
  {
    id: "idole-lancome",
    name: "Idôle",
    brand: "Blue Perfumery Classic",
    price: 650,
    originalPrice: 2800,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPC-IDL-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["bergamot", "pembe biber", "armut", "gül", "yasemin", "beyaz misk", "sedir", "vanilya"],
    characteristics: ["ferah", "çiçeksi", "temiz", "modern", "feminen", "hafif"],
    ageRange: { min: 20, max: 40 },
    shopierLink: "https://www.shopier.com/blueperfumery/idole",
    description: "Lancôme Idôle'ün Blue Perfumery yorumu. Modern kadının temiz ve ferah kokusu.",
  },
  {
    id: "black-opium-ysl",
    name: "Black Opium",
    brand: "Blue Perfumery Classic",
    price: 650,
    originalPrice: 3000,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPC-BOP-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["pembe biber", "portakal çiçeği", "armut", "kahve", "yasemin", "acı badem", "vanilya", "paçuli", "sedir"],
    characteristics: ["tatlı", "kahveli", "bağımlılık yapıcı", "seksi", "gece", "yoğun"],
    ageRange: { min: 20, max: 40 },
    shopierLink: "https://www.shopier.com/blueperfumery/black-opium",
    description: "YSL Black Opium'un Blue Perfumery yorumu. Kahve ve vanilyalın karşı konulmaz cazibesi.",
  },
  {
    id: "good-girl-blush",
    name: "Good Girl Blush",
    brand: "Blue Perfumery Classic",
    price: 650,
    originalPrice: 3200,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPC-GGB-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["liçi", "bergamot", "gül", "şakayık", "ylang-ylang", "tonka fasulyesi", "vanilya", "misk"],
    characteristics: ["çiçeksi", "tatlı", "feminen", "romantik", "zarif", "modern"],
    ageRange: { min: 20, max: 40 },
    shopierLink: "https://www.shopier.com/blueperfumery/good-girl-blush",
    description: "Carolina Herrera Good Girl Blush'ın Blue Perfumery yorumu. Gül ve şakayığın pembe rüyası.",
  },
  {
    id: "terre-dhermes",
    name: "Terre d'Hermès",
    brand: "Blue Perfumery Classic",
    price: 650,
    originalPrice: 3500,
    ml: 50,
    gender: "male" as const,
    category: "man" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPC-TDH-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["portakal", "greyfurt", "çakmaktaşı", "biber", "sardunya", "paçuli", "vetiver", "sedir", "benzoin"],
    characteristics: ["toprak", "odunsu", "narenciyeli", "maskülen", "sofistike", "doğal"],
    ageRange: { min: 28, max: 60 },
    shopierLink: "https://www.shopier.com/blueperfumery/terre-dhermes",
    description: "Hermès Terre d'Hermès'in Blue Perfumery yorumu. Toprağın ve ağaçların maskülen karakteri.",
  },
  {
    id: "invictus-victory-elixir",
    name: "Invictus Victory Elixir",
    brand: "Blue Perfumery Urban",
    price: 650,
    originalPrice: 2600,
    ml: 50,
    gender: "male" as const,
    category: "man" as const,
    status: "active" as const,
    stock: 10,
    sku: "BPU-IVE-50",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["acı badem", "kakule", "tonka fasulyesi", "lavanta", "benzoin", "vanilya", "guaiac ağacı"],
    characteristics: ["tatlı", "sıcak", "güçlü", "maskülen", "seksi", "etkileyici"],
    ageRange: { min: 20, max: 40 },
    shopierLink: "https://www.shopier.com/blueperfumery/invictus-victory-elixir",
    description: "Paco Rabanne Invictus Victory Elixir'in Blue Perfumery yorumu. Zafer ve gücün tatlı kokusu.",
  },
];

async function addNewPerfumes() {
  try {
    const MONGODB_URI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/blueperfumery";

    console.log("🔄 MongoDB'ye bağlanılıyor...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB bağlantısı başarılı\n");

    // Mevcut ürün sayısını göster
    const existingCount = await Product.countDocuments();
    console.log(`📦 Mevcut ürün sayısı: ${existingCount}`);

    // Yeni ürünleri ekle (mevcut ID'lerle çakışmayı kontrol et)
    console.log(`\n🧴 ${newPerfumes.length} yeni parfüm ekleniyor...\n`);

    let addedCount = 0;
    let skippedCount = 0;

    for (const perfume of newPerfumes) {
      // ID veya SKU çakışması kontrolü
      const existing = await Product.findOne({
        $or: [{ id: perfume.id }, { sku: perfume.sku }],
      });

      if (existing) {
        console.log(`⏭️  Atlandı (zaten var): ${perfume.name}`);
        skippedCount++;
        continue;
      }

      // Yeni ürün ekle
      const product = new Product(perfume);
      await product.save();
      console.log(`✅ Eklendi: ${perfume.name} (${perfume.brand})`);
      addedCount++;
    }

    // Özet
    console.log("\n" + "═".repeat(50));
    console.log("📊 ÖZET");
    console.log("═".repeat(50));
    console.log(`✅ Eklenen: ${addedCount} parfüm`);
    console.log(`⏭️  Atlanan: ${skippedCount} parfüm`);
    
    const totalCount = await Product.countDocuments();
    console.log(`📦 Toplam ürün: ${totalCount}`);

    // Kategori dağılımı
    const categoryStats = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log("\n📁 Kategori Dağılımı:");
    categoryStats.forEach((stat) => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

    // Cinsiyet dağılımı
    const genderStats = await Product.aggregate([
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);

    console.log("\n⚧️  Cinsiyet Dağılımı:");
    genderStats.forEach((stat) => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

    // Yeni eklenen parfümleri listele
    console.log("\n🆕 Yeni Eklenen Parfümler:");
    console.log("─".repeat(50));
    for (const perfume of newPerfumes) {
      const inDb = await Product.findOne({ id: perfume.id });
      if (inDb) {
        console.log(`   • ${perfume.name} | ${perfume.gender} | ₺${perfume.price} | Stok: ${perfume.stock}`);
      }
    }

    console.log("\n" + "═".repeat(50));
    console.log("🎉 İşlem tamamlandı!");
    console.log("═".repeat(50));

  } catch (error) {
    console.error("❌ Hata:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Veritabanı bağlantısı kapatıldı");
    process.exit(0);
  }
}

// Script'i çalıştır
addNewPerfumes();
