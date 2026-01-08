import mongoose, { Schema, Document } from "mongoose";

// Mesaj tipi
export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  recommendedProducts?: {
    id: string;
    name: string;
    brand: string;
  }[];
}

// Chat Session arayüzü
export interface IChatSession {
  sessionId: string; // Unique session ID (frontend'den gelen)
  visitorId: string; // Benzersiz ziyaretçi ID
  userAgent: string;
  ip?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  messages: IChatMessage[];
  messageCount: number;
  firstMessageAt: Date;
  lastMessageAt: Date;
  isActive: boolean;
}

export interface IChatSessionDocument extends IChatSession, Document {}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    recommendedProducts: [
      {
        id: String,
        name: String,
        brand: String,
      },
    ],
  },
  { _id: false }
);

const chatSessionSchema = new Schema<IChatSessionDocument>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    visitorId: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: "",
    },
    ip: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    device: {
      type: String,
      default: "",
    },
    browser: {
      type: String,
      default: "",
    },
    os: {
      type: String,
      default: "",
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    firstMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// İndeksler
chatSessionSchema.index({ lastMessageAt: -1 });
chatSessionSchema.index({ createdAt: -1 });
chatSessionSchema.index({ isActive: 1 });

export const ChatSession = mongoose.model<IChatSessionDocument>(
  "ChatSession",
  chatSessionSchema
);
