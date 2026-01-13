const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Create deposit
const createDeposit = async (req, res) => {
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

    if (!amount) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const database = getDatabase();
    const result = await database.collection("deposit").insertOne({
      userName,
      amount,
      phone,
      tnxID,
      paymentMethod,
      project,
      status,
      userID,
      depositDate: depositDate || new Date(),
    });

    if (!result) {
      console.error("Failed to insert information into the database");
      return res
        .status(500)
        .json({ message: "Failed to submit information" });
    }

    res.status(201).json({ message: "Information submitted successfully" });
  } catch (error) {
    console.error("Error submitting information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update deposit status
const updateDepositStatus = async (req, res) => {
  try {
    const { status, id } = req.body;
    const database = getDatabase();

    const deposit = await database
      .collection("deposit")
      .findOne({ _id: ObjectId(id) });
    if (!deposit) {
      return res
        .status(404)
        .json({ message: "Deposit History not found!" });
    }

    await database
      .collection("deposit")
      .updateOne({ _id: ObjectId(id) }, { $set: { status } });

    const updatedDeposit = await database
      .collection("deposit")
      .findOne({ _id: ObjectId(id) });

    res.status(200).json({
      message: "Status updated successfully",
      user: updatedDeposit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all deposits
const getAllDeposits = async (req, res) => {
  try {
    const database = getDatabase();
    const users = await database.collection("deposit").find().toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get deposits by user ID
const getDepositsByUserId = async (req, res) => {
  try {
    const { userID } = req.params;
    const database = getDatabase();

    if (!userID) {
      return res.status(400).json({ message: "userID is required" });
    }

    const deposits = await database
      .collection("deposit")
      .find({ userID: userID })
      .toArray();

    if (deposits.length === 0) {
      return res
        .status(404)
        .json({ message: "No deposits found for the given userID" });
    }

    res.status(200).json({ deposits });
  } catch (error) {
    console.error("Error fetching deposit information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete deposit
const deleteDeposit = async (req, res) => {
  try {
    const id = req.params.id;
    const database = getDatabase();

    const result = await database.collection("deposit").deleteOne({
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
  createDeposit,
  updateDepositStatus,
  getAllDeposits,
  getDepositsByUserId,
  deleteDeposit,
};
