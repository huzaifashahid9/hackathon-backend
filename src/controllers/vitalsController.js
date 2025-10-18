import ManualVitals from "../models/ManualVitals.js";
import { generateVitalsInsights } from "../config/gemini.js";


export const addVitals = async (req, res) => {
  try {
    const {
      recordDate,
      bloodPressure,
      bloodSugar,
      weight,
      height,
      heartRate,
      temperature,
      oxygenLevel,
      notes,
      symptoms,
    } = req.body;

    if (!recordDate) {
      return res.status(400).json({
        success: false,
        message: "Record date is required",
      });
    }

    const vitals = await ManualVitals.create({
      userId: req.user.id,
      recordDate,
      bloodPressure,
      bloodSugar,
      weight,
      height,
      heartRate,
      temperature,
      oxygenLevel,
      notes,
      symptoms,
    });

    res.status(201).json({
      success: true,
      message: "Vitals added successfully",
      vitals,
    });
  } catch (error) {
    console.error("Add vitals error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error adding vitals",
    });
  }
};


export const getVitals = async (req, res) => {
  try {
    const { startDate, endDate, limit = 50, page = 1 } = req.query;

    const query = { userId: req.user.id };

    if (startDate || endDate) {
      query.recordDate = {};
      if (startDate) query.recordDate.$gte = new Date(startDate);
      if (endDate) query.recordDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const vitals = await ManualVitals.find(query)
      .sort({ recordDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await ManualVitals.countDocuments(query);

    res.status(200).json({
      success: true,
      count: vitals.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      vitals,
    });
  } catch (error) {
    console.error("Get vitals error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching vitals",
    });
  }
};

export const getVitalById = async (req, res) => {
  try {
    const vital = await ManualVitals.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!vital) {
      return res.status(404).json({
        success: false,
        message: "Vital record not found",
      });
    }

    res.status(200).json({
      success: true,
      vital,
    });
  } catch (error) {
    console.error("Get vital error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching vital record",
    });
  }
};


export const updateVitals = async (req, res) => {
  try {
    const vital = await ManualVitals.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!vital) {
      return res.status(404).json({
        success: false,
        message: "Vital record not found",
      });
    }

    const allowedUpdates = [
      "recordDate",
      "bloodPressure",
      "bloodSugar",
      "weight",
      "height",
      "heartRate",
      "temperature",
      "oxygenLevel",
      "notes",
      "symptoms",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        vital[field] = req.body[field];
      }
    });

    await vital.save();

    res.status(200).json({
      success: true,
      vital,
    });
  } catch (error) {
    console.error("Update vitals error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error updating vitals",
    });
  }
};


export const deleteVitals = async (req, res) => {
  try {
    const vital = await ManualVitals.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!vital) {
      return res.status(404).json({
        success: false,
        message: "Vital record not found",
      });
    }

    await vital.deleteOne();

    res.status(200).json({
      success: true,
      message: "Vital record deleted successfully",
    });
  } catch (error) {
    console.error("Delete vitals error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting vital record",
    });
  }
};

export const getVitalsStats = async (req, res) => {
  try {
    const totalRecords = await ManualVitals.countDocuments({
      userId: req.user.id,
    });

    // Get latest vitals
    const latestVital = await ManualVitals.findOne({ userId: req.user.id })
      .sort({ recordDate: -1 })
      .limit(1);

    // Get vitals from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentVitals = await ManualVitals.find({
      userId: req.user.id,
      recordDate: { $gte: thirtyDaysAgo },
    }).sort({ recordDate: -1 });

    // Calculate averages for last 30 days
    const averages = calculateAverages(recentVitals);

    res.status(200).json({
      success: true,
      stats: {
        totalRecords,
        latestVital,
        last30DaysCount: recentVitals.length,
        averages,
      },
    });
  } catch (error) {
    console.error("Get vitals stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching vitals statistics",
    });
  }
};

export const getVitalsInsights = async (req, res) => {
  try {
    const { vitalId } = req.body;

    let vitalsData;

    if (vitalId) {
      vitalsData = await ManualVitals.findOne({
        _id: vitalId,
        userId: req.user.id,
      });
    } else {
      // Get latest vital
      vitalsData = await ManualVitals.findOne({ userId: req.user.id }).sort({
        recordDate: -1,
      });
    }

    if (!vitalsData) {
      return res.status(404).json({
        success: false,
        message: "No vital records found",
      });
    }

    const insights = await generateVitalsInsights(vitalsData);

    res.status(200).json({
      success: true,
      insights: insights.data,
    });
  } catch (error) {
    console.error("Get insights error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error generating insights",
    });
  }
};

// Helper function to calculate averages
const calculateAverages = (vitals) => {
  if (vitals.length === 0) return null;

  let bpSystolicSum = 0,
    bpDiastolicSum = 0,
    bpCount = 0;
  let sugarSum = 0,
    sugarCount = 0;
  let weightSum = 0,
    weightCount = 0;
  let heartRateSum = 0,
    heartRateCount = 0;

  vitals.forEach((v) => {
    if (v.bloodPressure?.systolic && v.bloodPressure?.diastolic) {
      bpSystolicSum += v.bloodPressure.systolic;
      bpDiastolicSum += v.bloodPressure.diastolic;
      bpCount++;
    }
    if (v.bloodSugar?.value) {
      sugarSum += v.bloodSugar.value;
      sugarCount++;
    }
    if (v.weight?.value) {
      weightSum += v.weight.value;
      weightCount++;
    }
    if (v.heartRate?.value) {
      heartRateSum += v.heartRate.value;
      heartRateCount++;
    }
  });

  return {
    bloodPressure:
      bpCount > 0
        ? {
            systolic: Math.round(bpSystolicSum / bpCount),
            diastolic: Math.round(bpDiastolicSum / bpCount),
          }
        : null,
    bloodSugar: sugarCount > 0 ? Math.round(sugarSum / sugarCount) : null,
    weight: weightCount > 0 ? (weightSum / weightCount).toFixed(1) : null,
    heartRate:
      heartRateCount > 0 ? Math.round(heartRateSum / heartRateCount) : null,
  };
};
