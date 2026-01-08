/**
 * Production Parfüm Sync Script
 *
 * Mevcut parfümleri günceller + eksikleri ekler
 * Çalıştırmak için: npm run sync-perfumes
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Product } from "../models/Product";

dotenv.config();

// Production'daki mevcut parfümleri güncelle (doğru ID'lerle)
const updateExistingPerfumes = [
  {
    id: "dior-jadore",
    name: "J'adore",
    brand: "Blue Perfumery",
    price: 650,
    stock: 10,
    notes: [
      "armut",
      "kavun",
      "manolya",
      "yasemin",
      "şam gülü",
      "orkide",
      "misk",
      "vanilya",
      "sedir",
    ],
    characteristics: ["çiçeksi", "zarif", "feminen", "sofistike", "ikonik"],
    description:
      "Dior J'adore - Armut ve kavunun taze açılışı, yasemin ve şam gülünün zarif kalbi, misk ve vanilyalın kalıcı sıcaklığı.",
  },
  {
    id: "armani-stronger-with-you-seluz",
    name: "Stronger With You",
    brand: "Blue Perfumery",
    price: 650,
    stock: 10,
    notes: [
      "kardamom",
      "pembe biber",
      "adaçayı",
      "kavun",
      "kestane",
      "vanilya",
      "amberwood",
    ],
    characteristics: ["tatlı", "sıcak", "baharatlı", "maskülen", "çekici"],
    description:
      "Armani Stronger With You - Kardamom ve pembe biberin baharatlı açılışı, kestane ve vanilyalın sıcak kapanışı.",
  },
  {
    id: "gucci-flora-gorgeous",
    name: "Flora Gorgeous Gardenia",
    brand: "Blue Perfumery",
    price: 650,
    stock: 10,
    notes: [
      "armut çiçeği",
      "kırmızı meyveler",
      "gardenya",
      "yasemin",
      "esmer şeker",
      "paçuli",
    ],
    characteristics: ["çiçeksi", "tatlı", "meyveli", "romantik", "feminen"],
    description:
      "Gucci Flora Gorgeous Gardenia - Armut çiçeği ve gardenyanın büyüleyici uyumu, esmer şekerin tatlı dokunuşu.",
  },
  {
    id: "mg-god-of-fire",
    name: "God of Fire",
    brand: "Blue Perfumery",
    price: 650,
    stock: 10,
    notes: [
      "mango",
      "zencefil",
      "kırmızı meyveler",
      "kumarin",
      "yasemin",
      "ud",
      "kehribar",
      "misk",
    ],
    characteristics: [
      "egzotik",
      "yoğun",
      "oryantal",
      "güçlü",
      "gizemli",
      "lüks",
    ],
    description:
      "Morph God of Fire - Mango ve zencefilin egzotik açılışı, ud ve kehribarın derin kalıcılığı.",
  },
  {
    id: "burberry-her",
    name: "Burberry Her",
    brand: "Blue Perfumery",
    price: 650,
    stock: 10,
    notes: [
      "çilek",
      "ahududu",
      "böğürtlen",
      "menekşe",
      "yasemin",
      "kaşmiran",
      "misk",
      "meşe yosunu",
    ],
    characteristics: ["meyveli", "tatlı", "feminen", "neşeli", "modern"],
    description:
      "Burberry Her - Çilek, ahududu ve böğürtlenin kırmızı meyve patlaması, kaşmiranın yumuşak sarmalı.",
  },
  {
    id: "dior-sauvage-edp",
    name: "Sauvage EDP",
    brand: "Blue Perfumery",
    price: 650,
    stock: 10,
    notes: [
      "bergamot",
      "lavanta",
      "yıldız anason",
      "hindistan cevizi",
      "ambroxan",
      "vanilya",
    ],
    characteristics: [
      "ferah",
      "baharatlı",
      "odunsu",
      "maskülen",
      "güçlü",
      "modern",
    ],
    description:
      "Dior Sauvage EDP - Bergamotun ferah açılışı, lavanta ve yıldız anasonun karakteri, ambroxanın güçlü kalıcılığı.",
  },
  {
    id: "pdm-delina",
    name: "Delina",
    brand: "Blue Perfumery",
    price: 650,
    stock: 10,
    notes: [
      "liçi",
      "ravent",
      "bergamot",
      "türk gülü",
      "şakayık",
      "vanilya",
      "kaşmiran",
      "misk",
      "vetiver",
    ],
    characteristics: [
      "çiçeksi",
      "tatlı",
      "romantik",
      "feminen",
      "lüks",
      "zarif",
    ],
    description:
      "Parfums de Marly Delina - Liçi ve raventin taze açılışı, türk gülü ve şakayığın romantik kalbi.",
  },
];

// Eksik parfümleri ekle
const newPerfumes = [
  {
    id: "nishane-hacivat",
    name: "Hacivat",
    brand: "Blue Perfumery",
    price: 650,
    originalPrice: 5500,
    ml: 50,
    gender: "unisex" as const,
    category: "niches" as const,
    status: "active" as const,
    stock: 10,
    sku: "BP-HCV-50",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: [
      "ananas",
      "greyfurt",
      "bergamot",
      "sedir",
      "paçuli",
      "yasemin",
      "meşe yosunu",
      "odunsu notalar",
    ],
    characteristics: [
      "ferah",
      "odunsu",
      "meyveli",
      "sofistike",
      "kalıcı",
      "modern",
    ],
    ageRange: { min: 22, max: 50 },
    shopierLink: "https://www.shopier.com/blueperfumery/hacivat",
    description:
      "Nishane Hacivat - Ananas ve greyfurtun tropik ferahlığı, sedir ve paçulinin odunsu derinliği.",
  },
  {
    id: "exnihilo-fleur-narcotique",
    name: "Fleur Narcotique",
    brand: "Blue Perfumery",
    price: 650,
    originalPrice: 5800,
    ml: 50,
    gender: "unisex" as const,
    category: "niches" as const,
    status: "active" as const,
    stock: 10,
    sku: "BP-FLN-50",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: [
      "bergamot",
      "liçi",
      "şeftali",
      "yasemin",
      "şakayık",
      "portakal çiçeği",
      "misk",
      "yosun",
      "odunsu notalar",
    ],
    characteristics: [
      "ferah",
      "çiçeksi",
      "bağımlılık yapıcı",
      "zarif",
      "modern",
      "unisex",
    ],
    ageRange: { min: 22, max: 50 },
    shopierLink: "https://www.shopier.com/blueperfumery/fleur-narcotique",
    description:
      "Ex Nihilo Fleur Narcotique - Bergamot ve şeftalinin taze açılışı, yasemin ve şakayığın büyüleyici kalbi.",
  },
  {
    id: "burberry-goddess",
    name: "Goddess",
    brand: "Blue Perfumery",
    price: 650,
    originalPrice: 3100,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 10,
    sku: "BP-GDS-50",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: [
      "lavanta",
      "vanilya infüzyonu",
      "vanilya havyarı",
      "vanilya mutlak",
    ],
    characteristics: [
      "tatlı",
      "sıcak",
      "vanilyalı",
      "feminen",
      "sofistike",
      "gurme",
    ],
    ageRange: { min: 25, max: 50 },
    shopierLink: "https://www.shopier.com/blueperfumery/goddess",
    description:
      "Burberry Goddess - Üç katmanlı vanilyanın büyüleyici yolculuğu, lavantanın zarif dokunuşu.",
  },
  {
    id: "lancome-idole",
    name: "Idôle",
    brand: "Blue Perfumery",
    price: 650,
    originalPrice: 2800,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 10,
    sku: "BP-IDL-50",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["armut", "bergamot", "gül", "yasemin", "beyaz misk", "vanilya"],
    characteristics: [
      "ferah",
      "çiçeksi",
      "temiz",
      "modern",
      "feminen",
      "hafif",
    ],
    ageRange: { min: 20, max: 40 },
    shopierLink: "https://www.shopier.com/blueperfumery/idole",
    description:
      "Lancôme Idôle - Armut ve bergamotun ferah açılışı, gül ve yaseminin zarif kalbi.",
  },
  {
    id: "ysl-black-opium",
    name: "Black Opium",
    brand: "Blue Perfumery",
    price: 650,
    originalPrice: 3000,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 10,
    sku: "BP-BOP-50",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: [
      "armut",
      "pembe biber",
      "kahve",
      "yasemin",
      "acı badem",
      "vanilya",
      "paçuli",
      "sedir",
    ],
    characteristics: [
      "tatlı",
      "kahveli",
      "bağımlılık yapıcı",
      "seksi",
      "gece",
      "yoğun",
    ],
    ageRange: { min: 20, max: 40 },
    shopierLink: "https://www.shopier.com/blueperfumery/black-opium",
    description:
      "YSL Black Opium - Kahve ve vanilyalın karşı konulmaz cazibesi, acı bademin gizemli dokunuşu.",
  },
  {
    id: "ch-good-girl-blush",
    name: "Good Girl Blush",
    brand: "Blue Perfumery",
    price: 650,
    originalPrice: 3200,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 10,
    sku: "BP-GGB-50",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: [
      "bergamot",
      "acı badem",
      "şakayık",
      "ylang-ylang",
      "vanilya",
      "tonka fasulyesi",
    ],
    characteristics: [
      "çiçeksi",
      "tatlı",
      "feminen",
      "romantik",
      "zarif",
      "modern",
    ],
    ageRange: { min: 20, max: 40 },
    shopierLink: "https://www.shopier.com/blueperfumery/good-girl-blush",
    description:
      "Carolina Herrera Good Girl Blush - Bergamot ve acı bademin zarif açılışı, şakayık ve vanilyalın romantik kapanışı.",
  },
  {
    id: "hermes-terre",
    name: "Terre d'Hermès",
    brand: "Blue Perfumery",
    price: 650,
    originalPrice: 3500,
    ml: 50,
    gender: "male" as const,
    category: "man" as const,
    status: "active" as const,
    stock: 10,
    sku: "BP-TDH-50",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: [
      "portakal",
      "greyfurt",
      "çakmak taşı",
      "sardunya",
      "vetiver",
      "sedir",
      "paçuli",
      "benzoin",
    ],
    characteristics: [
      "toprak",
      "odunsu",
      "narenciyeli",
      "maskülen",
      "sofistike",
      "doğal",
    ],
    ageRange: { min: 28, max: 60 },
    shopierLink: "https://www.shopier.com/blueperfumery/terre-dhermes",
    description:
      "Hermès Terre d'Hermès - Portakal ve greyfurtun taze açılışı, çakmak taşının mineral karakteri, vetiverın toprak kalıcılığı.",
  },
  {
    id: "paco-invictus-victory-elixir",
    name: "Invictus Victory Elixir",
    brand: "Blue Perfumery",
    price: 650,
    originalPrice: 2600,
    ml: 50,
    gender: "male" as const,
    category: "man" as const,
    status: "active" as const,
    stock: 10,
    sku: "BP-IVE-50",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: [
      "lavanta",
      "kakule",
      "tütsü",
      "paçuli",
      "tonka fasulyesi",
      "vanilya",
    ],
    characteristics: [
      "tatlı",
      "sıcak",
      "güçlü",
      "maskülen",
      "seksi",
      "etkileyici",
    ],
    ageRange: { min: 20, max: 40 },
    shopierLink:
      "https://www.shopier.com/blueperfumery/invictus-victory-elixir",
    description:
      "Paco Rabanne Invictus Victory Elixir - Lavanta ve kakulenin aromatik açılışı, tonka ve vanilyalın tatlı gücü.",
  },
];

// Silinecek test parfümü
const deleteIds = ["stronger-f9yx9p"];

async function syncPerfumes() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI bulunamadı!");
    }

    console.log("🔄 MongoDB Atlas'a bağlanılıyor...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Bağlantı başarılı\n");

    // 1. Test parfümünü sil
    console.log("🗑️  Test parfümleri siliniyor...");
    for (const id of deleteIds) {
      const deleted = await Product.findOneAndDelete({ id });
      if (deleted) {
        console.log(`   ✅ Silindi: ${deleted.name}`);
      }
    }

    // 2. Mevcut parfümleri güncelle
    console.log("\n📝 Mevcut parfümler güncelleniyor...");
    for (const update of updateExistingPerfumes) {
      const result = await Product.findOneAndUpdate(
        { id: update.id },
        { $set: update },
        { new: true }
      );
      if (result) {
        console.log(`   ✅ ${result.name}`);
      } else {
        console.log(`   ⚠️  Bulunamadı: ${update.id}`);
      }
    }

    // 3. Yeni parfümleri ekle
    console.log("\n➕ Yeni parfümler ekleniyor...");
    for (const perfume of newPerfumes) {
      const existing = await Product.findOne({
        $or: [{ id: perfume.id }, { sku: perfume.sku }],
      });

      if (existing) {
        console.log(`   ⏭️  Zaten var: ${perfume.name}`);
        continue;
      }

      const product = new Product(perfume);
      await product.save();
      console.log(`   ✅ Eklendi: ${perfume.name}`);
    }

    // 4. Özet
    const totalProducts = await Product.countDocuments();
    const products = await Product.find({}).sort({ name: 1 });

    console.log("\n" + "═".repeat(55));
    console.log("📊 PRODUCTION VERİTABANI DURUMU");
    console.log("═".repeat(55));
    console.log(`📦 Toplam Parfüm: ${totalProducts}`);

    console.log("\n📋 Parfüm Listesi:");
    console.log("─".repeat(55));
    products.forEach((p, i) => {
      console.log(
        `${String(i + 1).padStart(2)}. ${p.name.padEnd(25)} | ${p.gender.padEnd(
          6
        )} | ₺${p.price} | Stok: ${p.stock}`
      );
    });

    // Kategori dağılımı
    const stats = await Product.aggregate([
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);

    console.log("\n⚧️  Cinsiyet Dağılımı:");
    stats.forEach((s) => console.log(`   ${s._id}: ${s.count}`));

    console.log("\n" + "═".repeat(55));
    console.log("🎉 Sync tamamlandı!");
    console.log("═".repeat(55));
  } catch (error) {
    console.error("❌ Hata:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Bağlantı kapatıldı");
    process.exit(0);
  }
}

syncPerfumes();
