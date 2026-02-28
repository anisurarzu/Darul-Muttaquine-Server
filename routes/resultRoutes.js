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
  insertResultCalculationConfigClass3To5,
  insertResultCalculationConfigClass6To12,
  getResultCalculationConfigApi,
  getResultCalculationPercentOptions,
} = require("../controllers/resultController");

router.post("/add-result", verifyAuthToken, addResult);
router.post("/update-course-fund", verifyAuthToken, updateCourseFund);
router.delete("/result/:scholarshipRollNumber", verifyAuthToken, deleteResult);
router.get("/search-result/:scholarshipRollNumber", searchResult);
router.get("/total-searches", getTotalSearches);
router.get("/result-stats", getResultStats);
router.get("/institute-wise-stats", getInstituteWiseStats);

router.get("/result-calculation-config/percent-options", getResultCalculationPercentOptions);
router.post("/result-calculation-config/class3to5", verifyAuthToken, insertResultCalculationConfigClass3To5);
router.post("/result-calculation-config/class6to12", verifyAuthToken, insertResultCalculationConfigClass6To12);
router.get("/result-calculation-config", getResultCalculationConfigApi);

module.exports = router;
