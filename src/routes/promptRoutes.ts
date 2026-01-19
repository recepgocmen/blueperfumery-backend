/**
 * Prompt API Routes
 *
 * Prompt yönetimi için CRUD endpoint'leri
 * Admin panelden erişilir
 */

import { Router, Request, Response } from "express";
import {
  getAllPrompts,
  getPrompt,
  getPromptsByCategory,
  upsertPrompt,
  deletePrompt,
  clearPromptCache,
  seedDefaultPrompts,
} from "../services/promptService";

const router = Router();

/**
 * GET /api/prompts
 * Tüm promptları listele
 */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const prompts = await getAllPrompts();
    res.status(200).json({
      success: true,
      data: prompts,
    });
  } catch (error: any) {
    console.error("Get prompts error:", error);
    res.status(500).json({
      success: false,
      error: "Promptlar alınamadı",
    });
  }
});

/**
 * GET /api/prompts/category/:category
 * Kategori bazlı promptları getir
 */
router.get(
  "/category/:category",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { category } = req.params;
      const validCategories = [
        "system",
        "greeting",
        "sales",
        "error",
        "profiling",
        "custom",
      ];

      if (!validCategories.includes(category)) {
        res.status(400).json({
          success: false,
          error: "Geçersiz kategori",
        });
        return;
      }

      const prompts = await getPromptsByCategory(category as any);
      res.status(200).json({
        success: true,
        data: prompts,
      });
    } catch (error: any) {
      console.error("Get prompts by category error:", error);
      res.status(500).json({
        success: false,
        error: "Promptlar alınamadı",
      });
    }
  }
);

/**
 * GET /api/prompts/:key
 * Tek prompt getir
 */
router.get("/:key", async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const prompt = await getPrompt(key);

    if (!prompt) {
      res.status(404).json({
        success: false,
        error: "Prompt bulunamadı",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: prompt,
    });
  } catch (error: any) {
    console.error("Get prompt error:", error);
    res.status(500).json({
      success: false,
      error: "Prompt alınamadı",
    });
  }
});

/**
 * POST /api/prompts
 * Yeni prompt oluştur
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, name, content, category, description, variables } = req.body;

    if (!key || !name || !content || !category) {
      res.status(400).json({
        success: false,
        error: "key, name, content ve category alanları zorunlu",
      });
      return;
    }

    const prompt = await upsertPrompt(key, {
      name,
      content,
      category,
      description,
      variables,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: prompt,
    });
  } catch (error: any) {
    console.error("Create prompt error:", error);
    res.status(500).json({
      success: false,
      error: "Prompt oluşturulamadı",
    });
  }
});

/**
 * PUT /api/prompts/:key
 * Prompt güncelle
 */
router.put("/:key", async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { name, content, category, description, variables, isActive } =
      req.body;

    const prompt = await upsertPrompt(key, {
      name,
      content,
      category,
      description,
      variables,
      isActive,
    });

    res.status(200).json({
      success: true,
      data: prompt,
    });
  } catch (error: any) {
    console.error("Update prompt error:", error);
    res.status(500).json({
      success: false,
      error: "Prompt güncellenemedi",
    });
  }
});

/**
 * DELETE /api/prompts/:key
 * Prompt sil
 */
router.delete("/:key", async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const deleted = await deletePrompt(key);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: "Prompt bulunamadı",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Prompt silindi",
    });
  } catch (error: any) {
    console.error("Delete prompt error:", error);
    res.status(500).json({
      success: false,
      error: "Prompt silinemedi",
    });
  }
});

/**
 * POST /api/prompts/cache/clear
 * Cache'i temizle
 */
router.post(
  "/cache/clear",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      clearPromptCache();
      res.status(200).json({
        success: true,
        message: "Cache temizlendi",
      });
    } catch (error: any) {
      console.error("Clear cache error:", error);
      res.status(500).json({
        success: false,
        error: "Cache temizlenemedi",
      });
    }
  }
);

/**
 * POST /api/prompts/seed
 * Varsayılan promptları yükle
 */
router.post("/seed", async (_req: Request, res: Response): Promise<void> => {
  try {
    await seedDefaultPrompts();
    res.status(200).json({
      success: true,
      message: "Varsayılan promptlar yüklendi",
    });
  } catch (error: any) {
    console.error("Seed prompts error:", error);
    res.status(500).json({
      success: false,
      error: "Promptlar yüklenemedi",
    });
  }
});

export default router;
