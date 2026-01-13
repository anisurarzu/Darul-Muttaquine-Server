const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  createSuggestion,
  getSuggestions,
  deleteSuggestion,
} = require("../controllers/suggestionController");

router.post("/suggestion-info", verifyAuthToken, createSuggestion);
router.get("/suggestion-info", verifyAuthToken, getSuggestions);
router.delete("/suggestion-info/:id", verifyAuthToken, deleteSuggestion);

module.exports = router;
