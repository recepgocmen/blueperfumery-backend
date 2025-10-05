/**
 * Data Migration Script
 *
 * This script migrates perfume data from the frontend to MongoDB database.
 *
 * Usage:
 * 1. Copy perfumes array from blueperfumery-fe/src/data/perfumes.ts
 * 2. Paste it in the perfumesData constant below
 * 3. Run: npx ts-node src/utils/migrateData.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Product } from "../models/Product";
import { IProduct } from "../types";

dotenv.config();

// Paste your perfumes data here from frontend
const perfumesData: any[] = [
  // Copy the perfumes array from blueperfumery-fe/src/data/perfumes.ts
  // Example:
  // {
  //   id: "mfk-br540",
  //   name: "Baccarat Rouge 540",
  //   brand: "Blue Perfumery Exclusive",
  //   ...
  // }
];

const migrateData = async () => {
  try {
    const MONGODB_URI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/blueperfumery";

    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("\n🗑️  Clearing existing products...");
    await Product.deleteMany({});
    console.log("✅ Cleared existing products");

    if (perfumesData.length === 0) {
      console.log("\n⚠️  No data to migrate!");
      console.log(
        "📝 Please copy perfumes array from frontend and paste it in this file."
      );
      process.exit(0);
    }

    console.log(`\n📦 Migrating ${perfumesData.length} products...`);

    // Transform and insert data
    const transformedData = perfumesData.map((perfume) => ({
      id: perfume.id,
      name: perfume.name,
      brand: perfume.brand,
      description: perfume.description,
      price: perfume.price,
      originalPrice: perfume.originalPrice,
      ml: perfume.ml,
      gender: perfume.gender,
      category: getCategoryFromBrand(perfume.brand),
      status: "active",
      stock: Math.floor(Math.random() * 50) + 10, // Random stock between 10-60
      sku: generateSKU(perfume.id),
      image: perfume.image,
      notes: perfume.notes || [],
      characteristics: perfume.characteristics || [],
      ageRange: perfume.ageRange || { min: 18, max: 60 },
      shopierLink: perfume.shopierLink,
    }));

    const result = await Product.insertMany(transformedData);
    console.log(`✅ Successfully migrated ${result.length} products`);

    // Display statistics
    console.log("\n📊 Migration Statistics:");
    const stats = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    stats.forEach((stat) => {
      console.log(`   ${stat._id}: ${stat.count} products`);
    });

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
    process.exit(0);
  }
};

// Helper function to determine category from brand name
function getCategoryFromBrand(brand: string): string {
  const brandLower = brand.toLowerCase();

  if (brandLower.includes("exclusive")) return "exclusive";
  if (brandLower.includes("premium")) return "premium";
  if (brandLower.includes("luxury")) return "luxury";
  if (brandLower.includes("artisanal")) return "artisanal";
  if (brandLower.includes("classic")) return "classic";
  if (brandLower.includes("urban")) return "urban";
  if (brandLower.includes("signature")) return "premium";

  return "premium"; // default
}

// Helper function to generate SKU
function generateSKU(id: string): string {
  const prefix = "BP";
  const code = id
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${code}-${random}`;
}

// Run migration
migrateData();

