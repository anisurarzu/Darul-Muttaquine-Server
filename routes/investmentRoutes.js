const express = require("express");
const router = express.Router();
const {
  registerInvestment,
  getLastInvestmentId,
  getInvestmentById,
  getAllInvestmentUsers,
  deleteInvestment,
  updateInvestment,
  addInvestmentDeposit,
} = require("../controllers/investmentController");

router.post("/investment-register", registerInvestment);
router.get("/investment-last-id", getLastInvestmentId);
router.get("/investment/:investmentID", getInvestmentById);
router.get("/investment-users", getAllInvestmentUsers);
router.delete("/investment/:investmentID", deleteInvestment);
router.put("/investment/:id", updateInvestment);
router.post("/investment/:id/deposit", addInvestmentDeposit);

module.exports = router;
