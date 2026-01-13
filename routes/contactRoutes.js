const express = require("express");
const router = express.Router();
const {
  createContactInfo,
  getAllContactInfo,
} = require("../controllers/contactController");

router.post("/contact-info", createContactInfo);
router.get("/contact-info", getAllContactInfo);

module.exports = router;
