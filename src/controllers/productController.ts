import { Request, Response } from "express";
import { Product } from "../models/Product";
import { ApiResponse, PaginatedResponse, IProduct } from "../types";

// Get all products with filters and pagination
export const getAllProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      gender,
      category,
      brand,
      status,
      search,
      minPrice,
      maxPrice,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter: any = {};

    // Apply filters
    if (gender) filter.gender = gender;
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (status) filter.status = status;
    else filter.status = "active"; // Default to active products

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sort: any = {};
    sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(filter),
    ]);

    const response: PaginatedResponse<IProduct> = {
      success: true,
      data: products as IProduct[],
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch products",
    });
  }
};

// Get product by ID
export const getProductById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ id });

    if (!product) {
      res.status(404).json({
        success: false,
        error: "Product not found",
      });
      return;
    }

    const response: ApiResponse<IProduct> = {
      success: true,
      data: product.toObject() as IProduct,
    };

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch product",
    });
  }
};

// Create new product
export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const productData = req.body as Partial<IProduct>;

    // Auto-generate an id if missing to satisfy schema requirement
    if (!productData.id) {
      const base = (productData.name || productData.sku || "product")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      const rand = Math.random().toString(36).slice(2, 8);
      productData.id = `${base || "product"}-${rand}`;
    }

    // Check if product with same id already exists
    const existingProduct = await Product.findOne({ id: productData.id });
    if (existingProduct) {
      res.status(409).json({
        success: false,
        error: "Duplicate product id",
      });
      return;
    }

    // Check if SKU already exists
    if (productData.sku) {
      const existingSKU = await Product.findOne({ sku: productData.sku });
      if (existingSKU) {
        res.status(409).json({
          success: false,
          error: "Duplicate SKU",
        });
        return;
      }
    }

    const product = new Product(productData);
    await product.save();

    const response: ApiResponse<IProduct> = {
      success: true,
      message: "Product created successfully",
      data: product.toObject() as IProduct,
    };

    res.status(201).json(response);
  } catch (error: any) {
    // Duplicate key error from Mongo
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "unique";
      res.status(409).json({
        success: false,
        error: `Duplicate value for unique field: ${field}`,
      });
      return;
    }
    // Mongoose validation errors
    if (error?.name === "ValidationError") {
      res.status(400).json({
        success: false,
        error: Object.values(error.errors || {})
          .map((e: any) => e.message)
          .join(", "),
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to create product",
    });
  }
};

// Update product
export const updateProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findOneAndUpdate({ id }, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      res.status(404).json({
        success: false,
        error: "Product not found",
      });
      return;
    }

    const response: ApiResponse<IProduct> = {
      success: true,
      message: "Product updated successfully",
      data: product.toObject() as IProduct,
    };

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update product",
    });
  }
};

// Delete product
export const deleteProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findOneAndDelete({ id });

    if (!product) {
      res.status(404).json({
        success: false,
        error: "Product not found",
      });
      return;
    }

    const response: ApiResponse<null> = {
      success: true,
      message: "Product deleted successfully",
    };

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete product",
    });
  }
};

// Get unique brands
export const getBrands = async (req: Request, res: Response): Promise<void> => {
  try {
    const brands = await Product.distinct("brand", { status: "active" });

    const response: ApiResponse<string[]> = {
      success: true,
      data: brands.sort(),
    };

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch brands",
    });
  }
};

// Get unique categories
export const getCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categories = await Product.distinct("category", { status: "active" });

    const response: ApiResponse<string[]> = {
      success: true,
      data: categories.sort(),
    };

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch categories",
    });
  }
};
