const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  createQuizMoney,
  getAllQuizMoney,
  getQuizMoneyByUserId,
  updateQuizMoneyStatus,
  deleteQuizMoney,
} = require("../controllers/quizMoneyController");

router.post("/quiz-money", verifyAuthToken, createQuizMoney);
router.get("/quiz-money", verifyAuthToken, getAllQuizMoney);
router.get("/quiz-money/:userID", verifyAuthToken, getQuizMoneyByUserId);
router.put("/quiz-money/:userID/status", verifyAuthToken, updateQuizMoneyStatus);
router.delete("/quiz-money/:id", verifyAuthToken, deleteQuizMoney);

module.exports = router;
