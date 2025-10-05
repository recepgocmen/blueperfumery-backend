import { Router } from "express";
import productRoutes from "./productRoutes";
import userRoutes from "./userRoutes";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Blue Perfumery API is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use("/products", productRoutes);
router.use("/users", userRoutes);

export default router;

