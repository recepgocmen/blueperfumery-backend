import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController";

const router = Router();

// GET routes
router.get("/", getAllUsers);
router.get("/:id", getUserById);

// POST routes
router.post("/", createUser);

// PUT routes
router.put("/:id", updateUser);

// DELETE routes
router.delete("/:id", deleteUser);

export default router;

