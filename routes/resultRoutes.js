const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  addResult,
  updateCourseFund,
  searchResult,
  getTotalSearches,
} = require("../controllers/resultController");

router.post("/add-result", verifyAuthToken, addResult);
router.post("/update-course-fund", verifyAuthToken, updateCourseFund);
router.get("/search-result/:scholarshipRollNumber", searchResult);
router.get("/total-searches", getTotalSearches);

module.exports = router;
