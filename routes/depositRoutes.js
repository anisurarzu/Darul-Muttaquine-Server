const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  createDeposit,
  updateDepositStatus,
  getAllDeposits,
  getDepositsByUserId,
  deleteDeposit,
} = require("../controllers/depositController");

router.post("/deposit-info", createDeposit);
router.post("/update-deposit-status", verifyAuthToken, updateDepositStatus);
router.get("/deposit-info", verifyAuthToken, getAllDeposits);
router.get("/deposit-info/:userID", verifyAuthToken, getDepositsByUserId);
router.delete("/deposit-info/:id", verifyAuthToken, deleteDeposit);

module.exports = router;
