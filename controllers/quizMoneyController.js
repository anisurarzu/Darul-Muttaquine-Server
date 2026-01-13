const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Create quiz money deposit
const createQuizMoney = async (req, res) => {
  try {
    const {
      amount,
      userName,
      userID,
      phone,
      tnxID,
      paymentMethod,
      project,
      status,
      depositDate,
    } = req.body;

    const database = getDatabase();
    const result = await database.collection("quiz-deposit").insertOne({
      userName,
      amount,
      phone,
      tnxID,
      paymentMethod,
      project,
      status,
      userID,
      depositDate: new Date(),
    });

    if (!result) {
      console.error("Failed to insert information into the database");
      return res
        .status(500)
        .json({ message: "Failed to submit information" });
    }

    res.status(200).json({ message: "Information submitted successfully" });
  } catch (error) {
    console.error("Error submitting information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all quiz money deposits
const getAllQuizMoney = async (req, res) => {
  try {
    const database = getDatabase();
    const users = await database
      .collection("quiz-deposit")
      .find()
      .toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get quiz money by user ID
const getQuizMoneyByUserId = async (req, res) => {
  try {
    const { userID } = req.params;
    const database = getDatabase();

    const user = await database
      .collection("quiz-deposit")
      .find({ userID: userID })
      .toArray();

    if (user.length > 0) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update quiz money status
const updateQuizMoneyStatus = async (req, res) => {
  try {
    const { userID } = req.params;
    const { status, amount } = req.body;
    const database = getDatabase();

    const userDeposits = await database
      .collection("quiz-deposit")
      .find({ userID: userID })
      .toArray();

    if (userDeposits.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const totalDepositAmount = userDeposits.reduce(
      (acc, deposit) => Number(acc) + Number(deposit.amount),
      0
    );

    if (amount > totalDepositAmount) {
      return res
        .status(400)
        .json({ message: "Insufficient balance for the requested amount" });
    }

    const result = await database.collection("quiz-deposit").updateOne(
      { userID: userID },
      { $set: { status: status } }
    );

    if (result.matchedCount > 0) {
      res.status(200).json({ message: "Status updated successfully" });
    } else {
      res
        .status(404)
        .json({ message: "User not found or no matching deposit record" });
    }
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete quiz money
const deleteQuizMoney = async (req, res) => {
  try {
    const id = req.params.id;
    const database = getDatabase();

    const result = await database.collection("quiz-deposit").deleteOne({
      _id: ObjectId(id),
    });

    if (result.deletedCount !== 1) {
      return res.status(404).json({ message: "Information not found" });
    }

    res.status(200).json({ message: "Information deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createQuizMoney,
  getAllQuizMoney,
  getQuizMoneyByUserId,
  updateQuizMoneyStatus,
  deleteQuizMoney,
};
