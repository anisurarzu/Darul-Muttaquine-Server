const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Create quiz
const createQuiz = async (req, res) => {
  try {
    const { quizName, startDate, endDate, quizQuestions, duration } = req.body;

    if (!Array.isArray(quizQuestions) || quizQuestions.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid quiz questions format" });
    }

    const database = getDatabase();
    const result = await database.collection("quizzes").insertOne({
      quizName,
      startDate,
      endDate,
      duration,
      quizQuestions,
      createdAt: new Date(),
    });

    res.status(200).json({ message: "Information submitted successfully" });
  } catch (error) {
    console.error("Error submitting information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update quiz status
const updateQuizStatus = async (req, res) => {
  try {
    const { quizId, status } = req.body;
    const database = getDatabase();

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const result = await database
      .collection("quizzes")
      .updateOne({ _id: new ObjectId(quizId) }, { $set: { status } });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all quizzes
const getAllQuizzes = async (req, res) => {
  try {
    const database = getDatabase();
    const quizzes = await database.collection("quizzes").find().toArray();
    res.status(200).json(quizzes);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get quiz by ID
const getQuizById = async (req, res) => {
  try {
    const quizId = req.params.id;
    const database = getDatabase();
    const quiz = await database
      .collection("quizzes")
      .findOne({ _id: new ObjectId(quizId) });
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.status(200).json(quiz);
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete quiz
const deleteQuiz = async (req, res) => {
  try {
    const quizId = req.params.id;
    const database = getDatabase();
    const result = await database
      .collection("quizzes")
      .deleteOne({ _id: new ObjectId(quizId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Submit quiz answer
const submitQuizAnswer = async (req, res) => {
  try {
    const {
      quizID,
      userId,
      userName,
      userPhone,
      userEmail,
      answers,
      isSubmitted,
      answerTime,
    } = req.body;

    const database = getDatabase();
    const userAnswer = {
      quizID,
      userId,
      userName,
      userPhone,
      userEmail,
      answers,
      isSubmitted,
      answerTime,
      submittedAt: new Date(),
    };

    const result = await database.collection("quizzes").updateOne(
      { _id: new ObjectId(quizID) },
      { $push: { userAnswers: userAnswer } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.status(200).json({ message: "Answers submitted successfully" });
  } catch (error) {
    console.error("Error submitting answers:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get quiz results by quiz ID
const getQuizResults = async (req, res) => {
  try {
    const { quizID } = req.params;
    const database = getDatabase();

    if (!ObjectId.isValid(quizID)) {
      return res.status(400).json({ message: "Invalid quizID format" });
    }

    const quiz = await database
      .collection("quizzes")
      .findOne({ _id: new ObjectId(quizID) });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const userIds = quiz.userAnswers.map((answer) => answer.userId);
    const users = await database
      .collection("users")
      .find({ uniqueId: { $in: userIds } })
      .toArray();

    const results = quiz.userAnswers
      .map((answer) => {
        const user = users.find((user) => user.uniqueId === answer.userId);
        const totalMarks = answer.answers.reduce(
          (sum, ans) => sum + (ans.mark || 0),
          0
        );
        const answerTime = answer?.answerTime;

        const isPublicUser = !user;

        return {
          userId: answer.userId,
          name: isPublicUser
            ? answer.userName || "Anonymous"
            : user.firstName + " " + user.lastName,
          image: user?.image || null,
          userPhone: isPublicUser
            ? answer.userPhone || null
            : user.phone || null,
          userEmail: isPublicUser
            ? answer.userEmail || null
            : user.email || null,
          totalMarks: totalMarks,
          answerTime: answerTime,
        };
      })
      .filter((result) => result !== null);

    res.status(200).json(results);
  } catch (error) {
    console.error("Error retrieving quiz results:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all quiz results
const getAllQuizResults = async (req, res) => {
  try {
    const database = getDatabase();
    const quizzes = await database
      .collection("quizzes")
      .find({ status: { $ne: "closed" } })
      .toArray();

    if (!quizzes.length) {
      return res.status(404).json({ message: "No quizzes found" });
    }

    const userIds = quizzes.flatMap((quiz) =>
      quiz.userAnswers.map((answer) => answer.userId)
    );
    const uniqueUserIds = [...new Set(userIds)];

    const users = await database
      .collection("users")
      .find({ uniqueId: { $in: uniqueUserIds } })
      .toArray();

    const userMap = users.reduce((map, user) => {
      map[user.uniqueId] = user;
      return map;
    }, {});

    const userResults = {};

    quizzes.forEach((quiz) => {
      quiz.userAnswers.forEach((answer) => {
        const userId = answer.userId;
        const totalMarks = answer.answers.reduce(
          (sum, ans) => sum + (ans.mark || 0),
          0
        );
        const answerTime = answer.answerTime || 0;

        if (!userResults[userId]) {
          userResults[userId] = {
            name: userMap[userId]
              ? userMap[userId].firstName + " " + userMap[userId].lastName
              : "Unknown",
            image: userMap[userId] ? userMap[userId].image : null,
            totalMarks: 0,
            totalAnswerTime: 0,
            quizzesAttended: 0,
          };
        }

        userResults[userId].totalMarks += totalMarks;
        userResults[userId].totalAnswerTime += answerTime;
        userResults[userId].quizzesAttended += 1;
      });
    });

    const results = Object.values(userResults);

    res.status(200).json(results);
  } catch (error) {
    console.error("Error retrieving quizzes results:", error);
    res
      .status(500)
      .json({ message: "No One Can Join The Party! / Server Error" });
  }
};

// Check phone in quiz
const checkPhoneInQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { phone } = req.query;
    const database = getDatabase();

    const quiz = await database.collection("quizzes").findOne({
      _id: new ObjectId(quizId),
      "userAnswers.userPhone": phone,
    });

    res.status(200).json({ exists: !!quiz });
  } catch (error) {
    console.error("Error checking phone in quiz:", error);
    res.status(500).json({ message: "Error checking phone number" });
  }
};

module.exports = {
  createQuiz,
  updateQuizStatus,
  getAllQuizzes,
  getQuizById,
  deleteQuiz,
  submitQuizAnswer,
  getQuizResults,
  getAllQuizResults,
  checkPhoneInQuiz,
};
