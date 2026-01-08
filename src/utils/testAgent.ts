/**
 * Agent Test Script
 * 
 * ⚠️ DEVRE DIŞI BIRAKILDI
 * 
 * Test agent'ları devre dışı bırakıldı.
 */

// Test agent devre dışı
console.log("⚠️  Test agent devre dışı bırakıldı.");
process.exit(0);

// Aşağıdaki kod çalışmayacak (yukarıda exit var)
import mongoose from "mongoose";
import dotenv from "dotenv";
import { getLibrarianAgent } from "../agents/librarian/LibrarianAgent";

dotenv.config();

async function testLibrarianAgent() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI bulunamadı!");
    }

    console.log("🔄 MongoDB'ye bağlanılıyor...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Bağlantı başarılı\n");

    console.log("🤖 Librarian Agent başlatılıyor...");
    const librarian = getLibrarianAgent();
    console.log("✅ Agent hazır!\n");

    // Test 1: Serbest soru sor
    console.log("═".repeat(50));
    console.log("📝 TEST 1: Serbest Soru");
    console.log("═".repeat(50));
    console.log("Soru: Erkekler için en popüler parfüm hangisi?\n");
    
    const answer1 = await librarian.askAboutPerfume("Erkekler için en popüler parfüm hangisi?");
    console.log("🤖 Cevap:", answer1);
    console.log();

    // Test 2: Parfüm analizi
    console.log("═".repeat(50));
    console.log("📝 TEST 2: Parfüm Analizi (Sauvage EDP)");
    console.log("═".repeat(50));
    
    const analysis = await librarian.analyzePerfume("dior-sauvage-edp");
    if (analysis) {
      console.log("📊 Özet:", analysis.summary);
      console.log("💪 Güçlü Yönler:", analysis.strengths.join(", "));
      console.log("👤 İdeal Kullanıcı:", analysis.idealFor.join(", "));
      console.log("👔 Kombin Önerisi:", analysis.pairingNotes.join(", "));
    }
    console.log();

    // Test 3: Benzer parfümler
    console.log("═".repeat(50));
    console.log("📝 TEST 3: Benzer Parfümler (J'adore)");
    console.log("═".repeat(50));
    
    const similar = await librarian.findSimilarPerfumes("dior-jadore", 3);
    similar.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} (${s.similarity}% benzerlik)`);
      console.log(`   📝 ${s.reason}`);
    });
    console.log();

    // Test 4: Spesifik parfüm sorusu
    console.log("═".repeat(50));
    console.log("📝 TEST 4: Spesifik Parfüm Sorusu");
    console.log("═".repeat(50));
    console.log("Soru: Bu parfüm hangi mevsimde kullanılmalı?\n");
    
    const answer2 = await librarian.askAboutPerfume(
      "Bu parfüm hangi mevsimde kullanılmalı?",
      "nishane-hacivat"
    );
    console.log("🤖 Cevap:", answer2);
    console.log();

    console.log("═".repeat(50));
    console.log("🎉 Tüm testler tamamlandı!");
    console.log("═".repeat(50));

  } catch (error) {
    console.error("❌ Hata:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Bağlantı kapatıldı");
    process.exit(0);
  }
}

testLibrarianAgent();
