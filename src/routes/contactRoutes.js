import express from "express";
import {
  submitContactForm,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
} from "../controllers/contactController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public route - Submit contact form
router.post("/", submitContactForm);

// Protected routes (Admin only)
router.get("/", protect, getAllContacts);
router.get("/:id", protect, getContactById);
router.patch("/:id", protect, updateContactStatus);
router.delete("/:id", protect, deleteContact);

export default router;
