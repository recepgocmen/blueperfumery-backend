import { Router } from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getBrands,
  getCategories,
} from "../controllers/productController";

const router = Router();

// GET routes
router.get("/", getAllProducts);
router.get("/brands", getBrands);
router.get("/categories", getCategories);
router.get("/:id", getProductById);

// POST routes
router.post("/", createProduct);

// PUT routes
router.put("/:id", updateProduct);

// DELETE routes
router.delete("/:id", deleteProduct);

export default router;

