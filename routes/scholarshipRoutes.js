const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  createScholarship,
  getAllScholarships,
  getOldScholarships,
  getOld2025Scholarships,
  getScholarshipById,
  updateScholarship,
  deleteScholarship,
} = require("../controllers/scholarshipController");

router.post("/scholarship-info", createScholarship);// Public endpoint
router.get("/scholarship-info", getAllScholarships); // Public endpoint
router.get("/scholarship-info-old", verifyAuthToken, getOldScholarships);
router.get("/scholarship-info-old-2025", verifyAuthToken, getOld2025Scholarships);
router.get("/scholarship-info/:id", getScholarshipById); // Already public
router.put("/scholarship-info/:id", updateScholarship);
router.delete("/scholarship-info/:id", deleteScholarship);

module.exports = router;
