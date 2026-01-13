const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  createCostInfo,
  createCostInfo2,
  addCostFile,
  updateCostStatus,
  getAllCostInfo,
  getCostInfoByUserId,
  deleteCostInfo,
  createScholarshipCostInfo,
  updateScholarshipCostStatus,
  getAllScholarshipCostInfo,
  getScholarshipCostInfoByScholarshipId,
  deleteScholarshipCostInfo,
} = require("../controllers/costController");

router.post("/cost-info", verifyAuthToken, createCostInfo);
router.post("/cost-info-2", createCostInfo2);
router.post("/add-cost-file", verifyAuthToken, addCostFile);
router.post("/update-cost-status", verifyAuthToken, updateCostStatus);
router.get("/cost-info", verifyAuthToken, getAllCostInfo);
router.get("/cost-info/:userID", verifyAuthToken, getCostInfoByUserId);
router.delete("/cost-info/:id", verifyAuthToken, deleteCostInfo);

// Scholarship cost info routes
router.post("/scholarship-cost-info", createScholarshipCostInfo);
router.patch("/scholarship-cost-info/:id", updateScholarshipCostStatus);
router.get("/scholarship-cost-info", getAllScholarshipCostInfo);
router.get("/scholarship-cost-info/:scholarshipID", getScholarshipCostInfoByScholarshipId);
router.delete("/scholarship-cost-info/:id", deleteScholarshipCostInfo);

module.exports = router;
