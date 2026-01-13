const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  createQuiz,
  updateQuizStatus,
  getAllQuizzes,
  getQuizById,
  deleteQuiz,
  submitQuizAnswer,
  getQuizResults,
  getAllQuizResults,
  checkPhoneInQuiz,
} = require("../controllers/quizController");

router.post("/quizzes", verifyAuthToken, createQuiz);
router.patch("/quizzes", verifyAuthToken, updateQuizStatus);
router.get("/quizzes", getAllQuizzes);
router.get("/quizzes/:id", getQuizById);
router.delete("/quizzes/:id", verifyAuthToken, deleteQuiz);
router.post("/quizzes-answer", submitQuizAnswer);
router.get("/quizzes-results/:quizID", getQuizResults);
router.get("/quizzes-results", getAllQuizResults);
router.get("/quizzes/:quizId/check-phone", checkPhoneInQuiz);

module.exports = router;
