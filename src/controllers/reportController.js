import Report from "../models/Report.js";
import { uploadImage } from "../config/cloudinary.js";
import { analyzeMedicalReport } from "../config/gemini.js";

// @desc    Upload medical report
// @route   POST /api/reports/upload
// @access  Private
export const uploadReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

    const { title, reportType, reportDate, notes } = req.body;

    if (!title || !reportType || !reportDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, report type, and report date",
      });
    }

    // Determine file type
    const fileType = req.file.mimetype.includes("pdf") ? "pdf" : "image";

    // Upload to Cloudinary
    const uploadResult = await uploadImage(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      "healthmate/reports"
    );

    // Create report document
    const report = await Report.create({
      userId: req.user.id,
      title,
      reportType,
      reportDate,
      file: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        fileType,
      },
      notes,
      isProcessed: false,
    });

    // Process with Gemini AI in background (async)
    processReportWithAI(report._id, req.file.buffer, req.file.mimetype, reportType);

    res.status(201).json({
      success: true,
      message: "Report uploaded successfully. AI analysis in progress...",
      report,
    });
  } catch (error) {
    console.error("Upload report error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error uploading report",
    });
  }
};

// Background AI processing
const processReportWithAI = async (reportId, fileBuffer, mimeType, reportType) => {
  try {
    const aiAnalysis = await analyzeMedicalReport(fileBuffer, mimeType, reportType);

    if (aiAnalysis.success) {
      await Report.findByIdAndUpdate(reportId, {
        aiSummary: aiAnalysis.data,
        isProcessed: true,
      });
    }
  } catch (error) {
    console.error("AI processing error:", error);
    await Report.findByIdAndUpdate(reportId, {
      isProcessed: false,
      processingError: error.message,
    });
  }
};

// @desc    Get all reports for logged in user
// @route   GET /api/reports
// @access  Private
export const getReports = async (req, res) => {
  try {
    const { reportType, startDate, endDate, limit = 50, page = 1 } = req.query;

    const query = { userId: req.user.id };

    if (reportType) {
      query.reportType = reportType;
    }

    if (startDate || endDate) {
      query.reportDate = {};
      if (startDate) query.reportDate.$gte = new Date(startDate);
      if (endDate) query.reportDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reports = await Report.find(query)
      .sort({ reportDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reports.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      reports,
    });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching reports",
    });
  }
};

// @desc    Get single report
// @route   GET /api/reports/:id
// @access  Private
export const getReportById = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Get report error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching report",
    });
  }
};

// @desc    Update report notes
// @route   PUT /api/reports/:id
// @access  Private
export const updateReport = async (req, res) => {
  try {
    const { title, notes, reportType, reportDate } = req.body;

    const report = await Report.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    if (title) report.title = title;
    if (notes !== undefined) report.notes = notes;
    if (reportType) report.reportType = reportType;
    if (reportDate) report.reportDate = reportDate;

    await report.save();

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Update report error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error updating report",
    });
  }
};

// @desc    Delete report
// @route   DELETE /api/reports/:id
// @access  Private
export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Delete from Cloudinary
    // await deleteImage(report.file.publicId);

    await report.deleteOne();

    res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting report",
    });
  }
};

// @desc    Get reports statistics
// @route   GET /api/reports/stats
// @access  Private
export const getReportsStats = async (req, res) => {
  try {
    const totalReports = await Report.countDocuments({ userId: req.user.id });

    const reportsByType = await Report.aggregate([
      { $match: { userId: req.user.id } },
      { $group: { _id: "$reportType", count: { $sum: 1 } } },
    ]);

    const recentReports = await Report.find({ userId: req.user.id })
      .sort({ reportDate: -1 })
      .limit(5)
      .select("title reportType reportDate isProcessed");

    res.status(200).json({
      success: true,
      stats: {
        totalReports,
        reportsByType,
        recentReports,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
    });
  }
};
