import mongoose, { Schema, Document } from "mongoose";
import { IProduct } from "../types";

// Omit both _id and id to avoid conflicts with Mongoose Document
export interface IProductDocument
  extends Omit<IProduct, "_id" | "id">,
    Document {
  id: string; // Custom id field (not the Mongoose _id)
}

const productSchema = new Schema<IProductDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    ml: {
      type: Number,
      required: true,
      min: 0,
    },
    gender: {
      type: String,
      enum: ["male", "female", "unisex"],
      required: true,
    },
    category: {
      type: String,
      enum: [
        "woman",
        "man",
        "unisex",
        "niches",
        "urban",
        "classic",
        "luxury",
        "premium",
        "exclusive",
        "artisanal",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "discontinued"],
      default: "active",
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
    },
    notes: {
      type: [String],
      default: [],
    },
    characteristics: {
      type: [String],
      default: [],
    },
    ageRange: {
      min: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      max: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
    },
    shopierLink: {
      type: String,
    },
    // Vector Search için embedding field
    embedding: {
      type: [Number],
      default: undefined,
      index: false, // Vector index ayrıca oluşturulacak
    },
    // Embedding oluşturulduğunda kullanılan metin
    embeddingText: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: "products",
  }
);

// Indexes for better query performance
productSchema.index({ name: "text", brand: "text", description: "text" });
productSchema.index({ category: 1, gender: 1 });
productSchema.index({ price: 1 });
productSchema.index({ status: 1 });

// Static methods
productSchema.statics.findByGender = function (gender: string) {
  return this.find({ gender, status: "active" });
};

productSchema.statics.findByCategory = function (category: string) {
  return this.find({ category, status: "active" });
};

productSchema.statics.findByPriceRange = function (min: number, max: number) {
  return this.find({ price: { $gte: min, $lte: max }, status: "active" });
};

export const Product = mongoose.model<IProductDocument>(
  "Product",
  productSchema
);
