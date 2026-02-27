const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  addResult,
  updateCourseFund,
  deleteResult,
  searchResult,
  getTotalSearches,
  getResultStats,
  getInstituteWiseStats,
} = require("../controllers/resultController");

router.post("/add-result", verifyAuthToken, addResult);
router.post("/update-course-fund", verifyAuthToken, updateCourseFund);
router.delete("/result/:scholarshipRollNumber", verifyAuthToken, deleteResult);
router.get("/search-result/:scholarshipRollNumber", searchResult);
router.get("/total-searches", getTotalSearches);
router.get("/result-stats", getResultStats);
router.get("/institute-wise-stats", getInstituteWiseStats);

module.exports = router;
