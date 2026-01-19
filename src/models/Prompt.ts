/**
 * Prompt Model
 *
 * Sistem promptlarını veritabanında saklar.
 * Admin panelden güncellenebilir.
 */

import mongoose, { Schema, Document } from "mongoose";

export interface IPrompt {
  key: string; // Unique identifier (e.g., "mira_system", "greeting", "sales_closing")
  name: string; // Display name
  content: string; // Prompt content
  category: "system" | "greeting" | "sales" | "error" | "profiling" | "custom";
  isActive: boolean;
  variables?: string[]; // Placeholder variables like {{user_name}}, {{product_name}}
  description?: string;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPromptDocument extends IPrompt, Document {}

const promptSchema = new Schema<IPromptDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["system", "greeting", "sales", "error", "profiling", "custom"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    variables: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    collection: "prompts",
  }
);

// Index for faster lookups
promptSchema.index({ category: 1, isActive: 1 });

export const Prompt = mongoose.model<IPromptDocument>("Prompt", promptSchema);
