/**
 * Database Seed Script
 *
 * Bu script MongoDB'yi admin panel datasıyla doldurur.
 * Çalıştırmak için: npm run seed
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Product } from "../models/Product";
import { User } from "../models/User";

dotenv.config();

// Admin panel'deki mock users (blueperfumery-admin-panel/src/services/mock-api.ts)
const seedUsers = [
  {
    name: "Admin User",
    email: "admin@blueperfumery.com",
    password: "admin123", // Will be hashed automatically
    role: "admin" as const,
    status: "active" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
  },
  {
    name: "John Doe",
    email: "john@example.com",
    password: "password123",
    role: "admin" as const,
    status: "active" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
  },
  {
    name: "Jane Smith",
    email: "jane@example.com",
    password: "password123",
    role: "user" as const,
    status: "active" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
  },
  {
    name: "Bob Johnson",
    email: "bob@example.com",
    password: "password123",
    role: "moderator" as const,
    status: "inactive" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
  },
];

// Tüm parfümler (mcp-server/src/data.ts)
const seedProducts = [
  {
    id: "mfk-br540",
    name: "Baccarat Rouge 540",
    brand: "Blue Perfumery Exclusive",
    price: 1250,
    originalPrice: 500,
    ml: 70,
    gender: "unisex" as const,
    category: "exclusive" as const,
    status: "active" as const,
    stock: 25,
    sku: "BPE-BR540-70",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["safran", "yasemin", "amber", "sedir"],
    characteristics: ["tatlı", "odunsu", "amber", "sıcak"],
    ageRange: { min: 20, max: 35 },
    shopierLink: "https://www.shopier.com/blueperfumery/baccarat-rouge-540",
    description:
      "Blue Perfumery koleksiyonundan lüks ve sofistike bir koku. Tatlı ve odunsu notalar ile öne çıkar.",
  },
  {
    id: "mfk-oud-satin",
    name: "Oud Satin Mood",
    brand: "Blue Perfumery Premium",
    price: 1350,
    originalPrice: 510,
    ml: 70,
    gender: "unisex" as const,
    category: "premium" as const,
    status: "active" as const,
    stock: 18,
    sku: "BPP-OSM-70",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["ud", "gül", "vanilya", "benjamin"],
    characteristics: ["oryantal", "zengin", "tatlı", "odunsu"],
    ageRange: { min: 20, max: 50 },
    shopierLink: "https://www.shopier.com/blueperfumery/oud-satin-mood",
    description: "Blue Perfumery'nin zengin ve yoğun oryantal kokusu.",
  },
  {
    id: "tf-lost-cherry",
    name: "Lost Cherry",
    brand: "Blue Perfumery Premium",
    price: 1380,
    originalPrice: 700,
    ml: 100,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 12,
    sku: "BPP-LC-100",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["kiraz", "badem", "tonka fasulyesi", "peru balsamı"],
    characteristics: ["tatlı", "meyveli", "gurme"],
    ageRange: { min: 20, max: 45 },
    shopierLink: "https://www.shopier.com/blueperfumery/lost-cherry",
    description: "Tatlı ve baştan çıkarıcı kiraz kokusu.",
  },
  {
    id: "tf-oud-wood",
    name: "Oud Wood",
    brand: "Blue Perfumery Luxury",
    price: 1400,
    originalPrice: 480,
    ml: 50,
    gender: "male" as const,
    category: "man" as const,
    status: "active" as const,
    stock: 8,
    sku: "BPL-OW-50",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["ud", "gül ağacı", "kakule", "sandal ağacı"],
    characteristics: ["odunsu", "baharatlı", "lüks", "rafine"],
    ageRange: { min: 25, max: 55 },
    shopierLink: "https://www.shopier.com/blueperfumery/oud-wood",
    description: "Sofistike ve maskülen bir ağaç kokusu.",
  },
  {
    id: "chanel-chance",
    name: "Chance",
    brand: "Blue Perfumery Classic",
    price: 900,
    originalPrice: 200,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 35,
    sku: "BPC-CH-50",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["pembe biber", "yasemin", "paçuli"],
    characteristics: ["çiçeksi", "ferah", "baharatlı"],
    ageRange: { min: 19, max: 45 },
    shopierLink: "https://www.shopier.com/blueperfumery/chance",
    description: "Zarif ve feminen bir koku.",
  },
  {
    id: "invictus",
    name: "Invictus",
    brand: "Blue Perfumery Urban",
    price: 600,
    originalPrice: 100,
    ml: 50,
    gender: "male" as const,
    category: "man" as const,
    status: "active" as const,
    stock: 42,
    sku: "BPU-INV-50",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["greyfurt", "deniz", "guaiac ağacı"],
    characteristics: ["ferah", "deniz", "odunsu"],
    ageRange: { min: 20, max: 35 },
    shopierLink: "https://www.shopier.com/blueperfumery/invictus",
    description: "Taze ve maskülen bir koku",
  },
  {
    id: "nasomatto-black-afgano",
    name: "Black Afgano",
    brand: "Blue Perfumery Artisanal",
    price: 1180,
    originalPrice: 155,
    ml: 30,
    gender: "unisex" as const,
    category: "niches" as const,
    status: "active" as const,
    stock: 6,
    sku: "BPA-BA-30",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["kenevir", "kahve", "ud", "tütün"],
    characteristics: ["reçineli", "karanlık", "yoğun", "bağımlılık yapıcı"],
    ageRange: { min: 28, max: 55 },
    shopierLink: "https://www.shopier.com/blueperfumery/black-afgano",
    description: "Derin ve karanlık bir bağımlılık parfümü.",
  },
  {
    id: "ysl-libre-woman",
    name: "Libre Woman",
    brand: "Blue Perfumery Classic",
    price: 800,
    originalPrice: 140,
    ml: 50,
    gender: "female" as const,
    category: "woman" as const,
    status: "active" as const,
    stock: 28,
    sku: "BPC-LW-50",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["lavanta", "portakal çiçeği", "vanilya", "misk"],
    characteristics: ["çiçeksi", "warm", "ferah"],
    ageRange: { min: 20, max: 40 },
    shopierLink: "https://www.shopier.com/blueperfumery/libre-woman",
    description: "Modern ve özgür bir kadın kokusu.",
  },
  {
    id: "mancera-cedrat-boise",
    name: "Cedrat Boise",
    brand: "Blue Perfumery Premium",
    price: 900,
    originalPrice: 195,
    ml: 120,
    gender: "unisex" as const,
    category: "unisex" as const,
    status: "active" as const,
    stock: 22,
    sku: "BPP-CB-120",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["narenciye", "sedir", "deri", "vanilya"],
    characteristics: ["ferah", "odunsu", "narenciyeli", "modern"],
    ageRange: { min: 22, max: 45 },
    shopierLink: "https://www.shopier.com/blueperfumery/cedrat-boise",
    description: "Energetic ve çarpıcı bir odunsu citrus kokusu",
  },
  {
    id: "memo-lalibela",
    name: "Lalibela",
    brand: "Blue Perfumery Artisanal",
    price: 1100,
    originalPrice: 300,
    ml: 75,
    gender: "unisex" as const,
    category: "niches" as const,
    status: "active" as const,
    stock: 14,
    sku: "BPA-LAL-75",
    image:
      "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=400&fit=crop&crop=center",
    notes: ["akgünlük", "vanilya", "misk", "badem"],
    characteristics: ["günlük", "ruhani", "tatlı", "reçineli"],
    ageRange: { min: 28, max: 55 },
    shopierLink: "https://www.shopier.com/blueperfumery/lalibela",
    description: "Ruhani ve derin bir koku deneyimi",
  },
];

async function seedDatabase() {
  try {
    const MONGODB_URI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/blueperfumery";

    console.log("🔄 Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    console.log("\n🗑️  Clearing existing data...");
    await Promise.all([User.deleteMany({}), Product.deleteMany({})]);
    console.log("✅ Database cleared");

    // Seed Users
    console.log(`\n👥 Creating ${seedUsers.length} users...`);
    const createdUsers = await User.insertMany(seedUsers);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Seed Products
    console.log(`\n🧴 Creating ${seedProducts.length} products...`);
    const createdProducts = await Product.insertMany(seedProducts);
    console.log(`✅ Created ${createdProducts.length} products`);

    // Display statistics
    console.log("\n📊 Database Statistics:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // User stats
    const userStats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log("\n👥 Users by Role:");
    userStats.forEach((stat) => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

    // Product stats
    const productStats = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          avgPrice: { $avg: "$price" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log("\n🧴 Products by Category:");
    productStats.forEach((stat) => {
      console.log(
        `   ${stat._id}: ${stat.count} products, ${
          stat.totalStock
        } total stock, ₺${Math.round(stat.avgPrice)} avg price`
      );
    });

    // Gender distribution
    const genderStats = await Product.aggregate([
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 },
        },
      },
    ]);

    console.log("\n⚧ Products by Gender:");
    genderStats.forEach((stat) => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

    // Total inventory value
    const inventoryValue = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
          totalStock: { $sum: "$stock" },
        },
      },
    ]);

    if (inventoryValue.length > 0) {
      console.log("\n💰 Inventory:");
      console.log(
        `   Total Value: ₺${inventoryValue[0].totalValue.toLocaleString()}`
      );
      console.log(`   Total Stock: ${inventoryValue[0].totalStock} units`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 Database seeded successfully!");
    console.log("\n📝 Test Credentials:");
    console.log("   Email: admin@blueperfumery.com");
    console.log("   Password: admin123");
    console.log("\n🔗 Test API:");
    console.log("   GET http://localhost:5000/api/products");
    console.log("   GET http://localhost:5000/api/users");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
    process.exit(0);
  }
}

// Run seeding
seedDatabase();
