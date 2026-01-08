/**
 * Parfüm Notalarını ve İsimlerini Güncelleme Script'i
 * 
 * Mevcut parfümlerin notalarını ve isimlerini günceller
 * Çalıştırmak için: npx ts-node src/utils/updatePerfumeNotes.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Product } from "../models/Product";

dotenv.config();

// Doğru nota bilgileri ve temiz isimler
const perfumeUpdates = [
  {
    id: "jadore-seluz",
    name: "J'adore",
    brand: "Blue Perfumery",
    notes: ["armut", "kavun", "manolya", "yasemin", "şam gülü", "orkide", "misk", "vanilya", "sedir"],
    characteristics: ["çiçeksi", "zarif", "feminen", "sofistike", "ikonik", "romantik"],
    description: "Dior'un efsanevi J'adore kokusunun Blue Perfumery yorumu. Armut ve kavunun taze açılışı, yasemin ve şam gülünün zarif kalbi, misk ve vanilyalın kalıcı sıcaklığı.",
  },
  {
    id: "stronger-with-you-seluz",
    name: "Stronger With You",
    brand: "Blue Perfumery",
    notes: ["kardamom", "pembe biber", "adaçayı", "kavun", "kestane", "vanilya", "amberwood"],
    characteristics: ["tatlı", "sıcak", "baharatlı", "maskülen", "çekici", "güçlü"],
    description: "Emporio Armani'nin ikonik erkek kokusunun Blue Perfumery yorumu. Kardamom ve pembe biberin baharatlı açılışı, kestane ve vanilyalın sıcak kapanışı.",
  },
  {
    id: "flora-gorgeous-seluz",
    name: "Flora Gorgeous Gardenia",
    brand: "Blue Perfumery",
    notes: ["armut çiçeği", "kırmızı meyveler", "gardenya", "yasemin", "esmer şeker", "paçuli"],
    characteristics: ["çiçeksi", "tatlı", "meyveli", "romantik", "feminen", "zarif"],
    description: "Gucci Flora Gorgeous Gardenia'nın Blue Perfumery yorumu. Armut çiçeği ve gardenyanın büyüleyici uyumu, esmer şekerin tatlı dokunuşu.",
  },
  {
    id: "god-of-fire-mg",
    name: "God of Fire",
    brand: "Blue Perfumery",
    notes: ["mango", "zencefil", "kırmızı meyveler", "kumarin", "yasemin", "ud", "kehribar", "misk"],
    characteristics: ["egzotik", "yoğun", "oryantal", "güçlü", "gizemli", "lüks", "tropik"],
    description: "Morph God of Fire'ın Blue Perfumery yorumu. Mango ve zencefilin egzotik açılışı, ud ve kehribarın derin kalıcılığı.",
  },
  {
    id: "burberry-her-seluz",
    name: "Burberry Her",
    brand: "Blue Perfumery",
    notes: ["çilek", "ahududu", "böğürtlen", "menekşe", "yasemin", "kaşmiran", "misk", "meşe yosunu"],
    characteristics: ["meyveli", "tatlı", "feminen", "neşeli", "modern", "seksi"],
    description: "Burberry Her kokusunun Blue Perfumery yorumu. Çilek, ahududu ve böğürtlenin kırmızı meyve patlaması, kaşmiranın yumuşak sarmalı.",
  },
  {
    id: "dior-sauvage-edp-seluz",
    name: "Sauvage EDP",
    brand: "Blue Perfumery",
    notes: ["bergamot", "lavanta", "yıldız anason", "hindistan cevizi", "ambroxan", "vanilya"],
    characteristics: ["ferah", "baharatlı", "odunsu", "maskülen", "güçlü", "modern", "seksi"],
    description: "Dior Sauvage EDP'nin Blue Perfumery yorumu. Bergamotun ferah açılışı, lavanta ve yıldız anasonun karakteri, ambroxanın güçlü kalıcılığı.",
  },
  {
    id: "nishane-hacivat-seluz",
    name: "Hacivat",
    brand: "Blue Perfumery",
    notes: ["ananas", "greyfurt", "bergamot", "sedir", "paçuli", "yasemin", "meşe yosunu", "odunsu notalar"],
    characteristics: ["ferah", "odunsu", "meyveli", "sofistike", "kalıcı", "modern", "unisex"],
    description: "Nishane Hacivat'ın Blue Perfumery yorumu. Ananas ve greyfurtun tropik ferahlığı, sedir ve paçulinin odunsu derinliği.",
  },
  {
    id: "delina-seluz",
    name: "Delina",
    brand: "Blue Perfumery",
    notes: ["liçi", "ravent", "bergamot", "türk gülü", "şakayık", "vanilya", "kaşmiran", "misk", "vetiver"],
    characteristics: ["çiçeksi", "tatlı", "romantik", "feminen", "lüks", "zarif", "prenses"],
    description: "Parfums de Marly Delina'nın Blue Perfumery yorumu. Liçi ve raventin taze açılışı, türk gülü ve şakayığın romantik kalbi.",
  },
  {
    id: "fleur-narcotique-seluz",
    name: "Fleur Narcotique",
    brand: "Blue Perfumery",
    notes: ["bergamot", "liçi", "şeftali", "yasemin", "şakayık", "portakal çiçeği", "misk", "yosun", "odunsu notalar"],
    characteristics: ["ferah", "çiçeksi", "bağımlılık yapıcı", "zarif", "modern", "unisex", "temiz"],
    description: "Ex Nihilo Fleur Narcotique'in Blue Perfumery yorumu. Bergamot ve şeftalinin taze açılışı, yasemin ve şakayığın büyüleyici kalbi.",
  },
  {
    id: "goddess-burberry",
    name: "Goddess",
    brand: "Blue Perfumery",
    notes: ["lavanta", "vanilya infüzyonu", "vanilya havyarı", "vanilya mutlak"],
    characteristics: ["tatlı", "sıcak", "vanilyalı", "feminen", "sofistike", "gurme", "lüks"],
    description: "Burberry Goddess'in Blue Perfumery yorumu. Üç katmanlı vanilyanın büyüleyici yolculuğu, lavantanın zarif dokunuşu.",
  },
  {
    id: "idole-lancome",
    name: "Idôle",
    brand: "Blue Perfumery",
    notes: ["armut", "bergamot", "gül", "yasemin", "beyaz misk", "vanilya"],
    characteristics: ["ferah", "çiçeksi", "temiz", "modern", "feminen", "hafif", "şık"],
    description: "Lancôme Idôle'ün Blue Perfumery yorumu. Armut ve bergamotun ferah açılışı, gül ve yaseminin zarif kalbi.",
  },
  {
    id: "black-opium-ysl",
    name: "Black Opium",
    brand: "Blue Perfumery",
    notes: ["armut", "pembe biber", "kahve", "yasemin", "acı badem", "vanilya", "paçuli", "sedir"],
    characteristics: ["tatlı", "kahveli", "bağımlılık yapıcı", "seksi", "gece", "yoğun", "karanlık"],
    description: "YSL Black Opium'un Blue Perfumery yorumu. Kahve ve vanilyalın karşı konulmaz cazibesi, acı bademin gizemli dokunuşu.",
  },
  {
    id: "good-girl-blush",
    name: "Good Girl Blush",
    brand: "Blue Perfumery",
    notes: ["bergamot", "acı badem", "şakayık", "ylang-ylang", "vanilya", "tonka fasulyesi"],
    characteristics: ["çiçeksi", "tatlı", "feminen", "romantik", "zarif", "modern", "pembe"],
    description: "Carolina Herrera Good Girl Blush'ın Blue Perfumery yorumu. Bergamot ve acı bademin zarif açılışı, şakayık ve vanilyalın romantik kapanışı.",
  },
  {
    id: "terre-dhermes",
    name: "Terre d'Hermès",
    brand: "Blue Perfumery",
    notes: ["portakal", "greyfurt", "çakmak taşı", "sardunya", "vetiver", "sedir", "paçuli", "benzoin"],
    characteristics: ["toprak", "odunsu", "narenciyeli", "maskülen", "sofistike", "doğal", "mineral"],
    description: "Hermès Terre d'Hermès'in Blue Perfumery yorumu. Portakal ve greyfurtun taze açılışı, çakmak taşının mineral karakteri, vetiverın toprak kalıcılığı.",
  },
  {
    id: "invictus-victory-elixir",
    name: "Invictus Victory Elixir",
    brand: "Blue Perfumery",
    notes: ["lavanta", "kakule", "tütsü", "paçuli", "tonka fasulyesi", "vanilya"],
    characteristics: ["tatlı", "sıcak", "güçlü", "maskülen", "seksi", "etkileyici", "baharatlı"],
    description: "Paco Rabanne Invictus Victory Elixir'in Blue Perfumery yorumu. Lavanta ve kakulenin aromatik açılışı, tonka ve vanilyalın tatlı gücü.",
  },
];

async function updatePerfumes() {
  try {
    const MONGODB_URI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/blueperfumery";

    console.log("🔄 MongoDB'ye bağlanılıyor...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB bağlantısı başarılı\n");

    console.log("🧴 Parfümler güncelleniyor (isim + notalar)...\n");

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const update of perfumeUpdates) {
      const result = await Product.findOneAndUpdate(
        { id: update.id },
        { 
          $set: { 
            name: update.name,
            brand: update.brand,
            notes: update.notes,
            characteristics: update.characteristics,
            description: update.description
          } 
        },
        { new: true }
      );

      if (result) {
        console.log(`✅ ${result.name}`);
        updatedCount++;
      } else {
        console.log(`⚠️  Bulunamadı: ${update.id}`);
        notFoundCount++;
      }
    }

    // Özet
    console.log("\n" + "═".repeat(50));
    console.log("📊 ÖZET");
    console.log("═".repeat(50));
    console.log(`✅ Güncellenen: ${updatedCount} parfüm`);
    if (notFoundCount > 0) {
      console.log(`⚠️  Bulunamayan: ${notFoundCount} parfüm`);
    }

    // Güncellenmiş parfüm listesi
    console.log("\n📦 Güncel Parfüm Listesi:");
    console.log("─".repeat(50));
    
    const allProducts = await Product.find({}).sort({ name: 1 });
    for (const product of allProducts) {
      const topNotes = product.notes.slice(0, 3).join(", ");
      console.log(`   • ${product.name} | ${product.gender} | ${topNotes}...`);
    }

    console.log("\n" + "═".repeat(50));
    console.log("🎉 Güncelleme tamamlandı!");
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
updatePerfumes();
