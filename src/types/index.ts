// User types
export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "user" | "moderator";
  status: "active" | "inactive" | "banned";
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

// Product/Perfume types
export interface IProduct {
  _id?: string;
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  originalPrice?: number;
  ml: number;
  gender: "male" | "female" | "unisex";
  category:
    | "woman"
    | "man"
    | "unisex"
    | "niches"
    | "urban"
    | "classic"
    | "luxury"
    | "premium"
    | "exclusive"
    | "artisanal";
  status: "active" | "inactive" | "discontinued";
  stock: number;
  sku: string;
  image?: string;
  notes: string[];
  characteristics: string[];
  ageRange: {
    min: number;
    max: number;
  };
  shopierLink?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

