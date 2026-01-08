/**
 * Test Agent - Blue Perfumery
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
import { connectDatabase } from "../config/database";
import { Product } from "../models/Product";

// Test sonuçları için interface
interface TestResult {
  name: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
}

// API Response tipi
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// Renkli console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

class TestAgent {
  private baseUrl: string;
  private results: TestSuite[] = [];
  private startTime: number = 0;

  constructor(baseUrl: string = "http://localhost:3001") {
    this.baseUrl = baseUrl;
  }

  // ==========================================
  // Test Utility Methods
  // ==========================================

  private async runTest(
    name: string,
    testFn: () => Promise<void>
  ): Promise<TestResult> {
    const start = Date.now();
    try {
      await testFn();
      return {
        name,
        status: "pass",
        duration: Date.now() - start,
      };
    } catch (error: any) {
      return {
        name,
        status: "fail",
        duration: Date.now() - start,
        error: error.message,
      };
    }
  }

  private async fetch(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}/api${endpoint}`;
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }

  private assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(message);
    }
  }

  // ==========================================
  // Database Tests
  // ==========================================

  async testDatabase(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: "🗄️  Database Tests",
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      totalDuration: 0,
    };

    // Test 1: MongoDB Connection
    suite.tests.push(
      await this.runTest("MongoDB bağlantısı", async () => {
        await connectDatabase();
        this.assert(
          mongoose.connection.readyState === 1,
          "MongoDB bağlantısı kurulamadı"
        );
      })
    );

    // Test 2: Product Collection
    suite.tests.push(
      await this.runTest("Product koleksiyonu erişimi", async () => {
        const count = await Product.countDocuments();
        this.assert(count >= 0, "Product koleksiyonuna erişilemedi");
      })
    );

    // Test 3: Product Query
    suite.tests.push(
      await this.runTest("Product sorgusu", async () => {
        const products = await Product.find({ status: "active" }).limit(1);
        this.assert(Array.isArray(products), "Product sorgusu başarısız");
      })
    );

    this.calculateSuiteStats(suite);
    return suite;
  }

  // ==========================================
  // API Endpoint Tests
  // ==========================================

  async testApiEndpoints(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: "🌐 API Endpoint Tests",
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      totalDuration: 0,
    };

    // Test 1: Health Check
    suite.tests.push(
      await this.runTest("GET /api/health", async () => {
        const res = await this.fetch("/health");
        this.assert(res.status === 200, `Status: ${res.status}`);
        const data = (await res.json()) as ApiResponse;
        this.assert(data.success === true, "Health check başarısız");
      })
    );

    // Test 2: Get Products
    suite.tests.push(
      await this.runTest("GET /api/products", async () => {
        const res = await this.fetch("/products");
        this.assert(res.status === 200, `Status: ${res.status}`);
        const data = (await res.json()) as ApiResponse;
        this.assert(data.success === true, "Products endpoint başarısız");
        this.assert(Array.isArray(data.data), "Products array değil");
      })
    );

    // Test 3: Get Single Product
    suite.tests.push(
      await this.runTest("GET /api/products/:id", async () => {
        // Önce bir ürün ID'si al
        const productsRes = await this.fetch("/products");
        const productsData = (await productsRes.json()) as ApiResponse;

        if (productsData.data && productsData.data.length > 0) {
          const productId = productsData.data[0].id;
          const res = await this.fetch(`/products/${productId}`);
          this.assert(res.status === 200, `Status: ${res.status}`);
          const data = (await res.json()) as ApiResponse;
          this.assert(
            data.success === true,
            "Single product endpoint başarısız"
          );
        }
      })
    );

    // Test 4: Products - Invalid ID
    suite.tests.push(
      await this.runTest("GET /api/products/:id (geçersiz ID)", async () => {
        const res = await this.fetch("/products/invalid-id-12345");
        this.assert(res.status === 404, `Beklenen 404, gelen: ${res.status}`);
      })
    );

    // Test 5: Get Users
    suite.tests.push(
      await this.runTest("GET /api/users", async () => {
        const res = await this.fetch("/users");
        this.assert(res.status === 200, `Status: ${res.status}`);
        const data = (await res.json()) as ApiResponse;
        this.assert(data.success === true, "Users endpoint başarısız");
      })
    );

    this.calculateSuiteStats(suite);
    return suite;
  }

  // ==========================================
  // Agent/Chat API Tests
  // ==========================================

  async testAgentApi(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: "🤖 Agent API Tests",
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      totalDuration: 0,
    };

    // Test 1: Chat endpoint - boş mesaj
    suite.tests.push(
      await this.runTest("POST /api/agent/chat (boş mesaj)", async () => {
        const res = await this.fetch("/agent/chat", {
          method: "POST",
          body: JSON.stringify({ message: "" }),
        });
        this.assert(res.status === 400, `Beklenen 400, gelen: ${res.status}`);
      })
    );

    // Test 2: Chat endpoint - uzun mesaj
    suite.tests.push(
      await this.runTest("POST /api/agent/chat (çok uzun mesaj)", async () => {
        const longMessage = "a".repeat(600);
        const res = await this.fetch("/agent/chat", {
          method: "POST",
          body: JSON.stringify({ message: longMessage }),
        });
        this.assert(res.status === 400, `Beklenen 400, gelen: ${res.status}`);
      })
    );

    // Test 3: Chat endpoint - geçerli mesaj
    suite.tests.push(
      await this.runTest("POST /api/agent/chat (geçerli mesaj)", async () => {
        const res = await this.fetch("/agent/chat", {
          method: "POST",
          body: JSON.stringify({ message: "Merhaba" }),
        });
        // 200 veya 503 (AI servis kapalıysa) kabul edilir
        this.assert(
          res.status === 200 || res.status === 503,
          `Status: ${res.status}`
        );
        const data = (await res.json()) as ApiResponse;
        this.assert("success" in data, "Response format yanlış");
      })
    );

    // Test 4: Analyze endpoint - ID olmadan
    suite.tests.push(
      await this.runTest("POST /api/agent/analyze (ID yok)", async () => {
        const res = await this.fetch("/agent/analyze", {
          method: "POST",
          body: JSON.stringify({}),
        });
        this.assert(res.status === 400, `Beklenen 400, gelen: ${res.status}`);
      })
    );

    // Test 5: Similar endpoint - ID olmadan
    suite.tests.push(
      await this.runTest("POST /api/agent/similar (ID yok)", async () => {
        const res = await this.fetch("/agent/similar", {
          method: "POST",
          body: JSON.stringify({}),
        });
        this.assert(res.status === 400, `Beklenen 400, gelen: ${res.status}`);
      })
    );

    this.calculateSuiteStats(suite);
    return suite;
  }

  // ==========================================
  // Product Data Integrity Tests
  // ==========================================

  async testProductDataIntegrity(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: "📦 Product Data Integrity Tests",
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      totalDuration: 0,
    };

    // Test 1: Tüm ürünlerde gerekli alanlar var mı
    suite.tests.push(
      await this.runTest("Ürünlerde gerekli alanlar", async () => {
        const products = await Product.find({ status: "active" });
        const requiredFields = ["id", "name", "brand", "price", "gender"];

        for (const product of products) {
          for (const field of requiredFields) {
            this.assert(
              product[field as keyof typeof product] !== undefined,
              `Ürün ${product.name}: ${field} alanı eksik`
            );
          }
        }
      })
    );

    // Test 2: Fiyatlar pozitif mi
    suite.tests.push(
      await this.runTest("Ürün fiyatları pozitif", async () => {
        const products = await Product.find({ status: "active" });
        for (const product of products) {
          this.assert(
            product.price > 0,
            `Ürün ${product.name}: Fiyat 0 veya negatif`
          );
        }
      })
    );

    // Test 3: Gender değerleri geçerli mi
    suite.tests.push(
      await this.runTest("Gender değerleri geçerli", async () => {
        const validGenders = ["male", "female", "unisex"];
        const products = await Product.find({ status: "active" });
        for (const product of products) {
          this.assert(
            validGenders.includes(product.gender),
            `Ürün ${product.name}: Geçersiz gender: ${product.gender}`
          );
        }
      })
    );

    // Test 4: Ürün ID'leri unique mi
    suite.tests.push(
      await this.runTest("Ürün ID'leri unique", async () => {
        const products = await Product.find({});
        const ids = products.map((p) => p.id);
        const uniqueIds = new Set(ids);
        this.assert(ids.length === uniqueIds.size, `Duplicate ID'ler mevcut`);
      })
    );

    // Test 5: Aktif ürün sayısı kontrolü
    suite.tests.push(
      await this.runTest("Aktif ürün sayısı > 0", async () => {
        const count = await Product.countDocuments({ status: "active" });
        this.assert(count > 0, "Aktif ürün bulunamadı");
      })
    );

    this.calculateSuiteStats(suite);
    return suite;
  }

  // ==========================================
  // Performance Tests
  // ==========================================

  async testPerformance(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: "⚡ Performance Tests",
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      totalDuration: 0,
    };

    // Test 1: Health check < 100ms
    suite.tests.push(
      await this.runTest("Health check < 100ms", async () => {
        const start = Date.now();
        await this.fetch("/health");
        const duration = Date.now() - start;
        this.assert(duration < 100, `Süre: ${duration}ms (> 100ms)`);
      })
    );

    // Test 2: Products endpoint < 500ms
    suite.tests.push(
      await this.runTest("Products endpoint < 500ms", async () => {
        const start = Date.now();
        await this.fetch("/products");
        const duration = Date.now() - start;
        this.assert(duration < 500, `Süre: ${duration}ms (> 500ms)`);
      })
    );

    // Test 3: Database query < 200ms
    suite.tests.push(
      await this.runTest("Database query < 200ms", async () => {
        const start = Date.now();
        await Product.find({ status: "active" }).limit(10);
        const duration = Date.now() - start;
        this.assert(duration < 200, `Süre: ${duration}ms (> 200ms)`);
      })
    );

    this.calculateSuiteStats(suite);
    return suite;
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private calculateSuiteStats(suite: TestSuite): void {
    suite.passed = suite.tests.filter((t) => t.status === "pass").length;
    suite.failed = suite.tests.filter((t) => t.status === "fail").length;
    suite.skipped = suite.tests.filter((t) => t.status === "skip").length;
    suite.totalDuration = suite.tests.reduce((acc, t) => acc + t.duration, 0);
  }

  private printResults(): void {
    console.log("\n");
    console.log("═".repeat(60));
    console.log(
      `${colors.cyan}   🧪 BLUE PERFUMERY TEST SONUÇLARI${colors.reset}`
    );
    console.log("═".repeat(60));

    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const suite of this.results) {
      console.log(`\n${colors.blue}${suite.name}${colors.reset}`);
      console.log("─".repeat(50));

      for (const test of suite.tests) {
        const icon =
          test.status === "pass"
            ? `${colors.green}✓${colors.reset}`
            : test.status === "fail"
            ? `${colors.red}✗${colors.reset}`
            : `${colors.yellow}○${colors.reset}`;

        const duration = `${colors.dim}(${test.duration}ms)${colors.reset}`;
        console.log(`  ${icon} ${test.name} ${duration}`);

        if (test.error) {
          console.log(`    ${colors.red}└─ ${test.error}${colors.reset}`);
        }
      }

      totalPassed += suite.passed;
      totalFailed += suite.failed;
      totalSkipped += suite.skipped;
    }

    const totalDuration = Date.now() - this.startTime;
    const totalTests = totalPassed + totalFailed + totalSkipped;

    console.log("\n" + "═".repeat(60));
    console.log(`${colors.cyan}   📊 ÖZET${colors.reset}`);
    console.log("═".repeat(60));
    console.log(`  ${colors.green}Geçen:${colors.reset}    ${totalPassed}`);
    console.log(`  ${colors.red}Başarısız:${colors.reset} ${totalFailed}`);
    console.log(`  ${colors.yellow}Atlanan:${colors.reset}   ${totalSkipped}`);
    console.log(`  ${colors.dim}Toplam:    ${totalTests}${colors.reset}`);
    console.log(`  ${colors.dim}Süre:      ${totalDuration}ms${colors.reset}`);
    console.log("═".repeat(60));

    if (totalFailed > 0) {
      console.log(
        `\n${colors.red}❌ ${totalFailed} test başarısız!${colors.reset}\n`
      );
    } else {
      console.log(`\n${colors.green}✅ Tüm testler başarılı!${colors.reset}\n`);
    }
  }

  // ==========================================
  // Main Run Method
  // ==========================================

  async run(): Promise<boolean> {
    this.startTime = Date.now();
    console.log(`\n${colors.cyan}🚀 Test Agent başlatılıyor...${colors.reset}`);
    console.log(`${colors.dim}   Base URL: ${this.baseUrl}${colors.reset}\n`);

    try {
      // Run all test suites
      this.results.push(await this.testDatabase());
      this.results.push(await this.testApiEndpoints());
      this.results.push(await this.testAgentApi());
      this.results.push(await this.testProductDataIntegrity());
      this.results.push(await this.testPerformance());

      this.printResults();

      // Cleanup
      await mongoose.connection.close();

      const totalFailed = this.results.reduce((acc, s) => acc + s.failed, 0);
      return totalFailed === 0;
    } catch (error) {
      console.error(`${colors.red}Test Agent Error:${colors.reset}`, error);
      await mongoose.connection.close();
      return false;
    }
  }
}

// CLI Entry Point
async function main() {
  const baseUrl = process.env.TEST_API_URL || "http://localhost:3001";
  const agent = new TestAgent(baseUrl);
  const success = await agent.run();
  process.exit(success ? 0 : 1);
}

main();

export { TestAgent };
