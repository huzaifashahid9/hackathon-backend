import express from "express";
import {
  uploadReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  getReportsStats,
} from "../controllers/reportController.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/stats", getReportsStats);
router.post("/upload", upload.single("file"), uploadReport);
router.get("/", getReports);
router.get("/:id", getReportById);
router.put("/:id", updateReport);
router.delete("/:id", deleteReport);

export default router;
