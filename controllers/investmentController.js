const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Register investment
const registerInvestment = async (req, res) => {
  try {
    const { userDMFID, investmentID, pinCode } = req.body;

    if (!userDMFID || !investmentID || !pinCode) {
      return res.status(400).json({ message: "সব তথ্য প্রয়োজন" });
    }

    const database = getDatabase();
    const exists = await database.collection("investmentUsers").findOne({
      $or: [{ investmentID }, { userDMFID }],
    });

    if (exists) {
      return res.status(400).json({
        message:
          "ইনভেস্টমেন্ট আইডি অথবা ব্যবহারকারী ইতিমধ্যে রেজিস্টার করা হয়েছে",
      });
    }

    const now = new Date();
    const result = await database.collection("investmentUsers").insertOne({
      userDMFID,
      investmentID,
      pinCode,
      numberOfShares: 0,
      depositInfo: [],
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({
      message: "Investment registration successful",
      id: result.insertedId,
    });
  } catch (error) {
    console.error("Investment registration error:", error);
    res.status(500).json({ message: "সার্ভার ত্রুটি হয়েছে" });
  }
};

// Get last investment ID
const getLastInvestmentId = async (req, res) => {
  try {
    const database = getDatabase();
    const last = await database
      .collection("investmentUsers")
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (last.length === 0) {
      return res.json({ lastInvestmentID: "DMI-000" });
    }

    res.json({ lastInvestmentID: last[0].investmentID });
  } catch (error) {
    console.error("Error fetching last investment ID:", error);
    res.status(500).json({ message: "সার্ভার ত্রুটি হয়েছে" });
  }
};

// Get investment by investment ID
const getInvestmentById = async (req, res) => {
  try {
    const { investmentID } = req.params;
    const database = getDatabase();

    const investment = await database
      .collection("investmentUsers")
      .aggregate([
        { $match: { investmentID } },
        {
          $lookup: {
            from: "users",
            localField: "userDMFID",
            foreignField: "uniqueId",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
      ])
      .toArray();

    if (investment.length === 0) {
      return res.status(404).json({ message: "Investment not found" });
    }

    res.json(investment[0]);
  } catch (error) {
    console.error("Error fetching investment by ID:", error);
    res.status(500).json({ message: "সার্ভার ত্রুটি হয়েছে" });
  }
};

// Get all investment users
const getAllInvestmentUsers = async (req, res) => {
  try {
    const database = getDatabase();
    const investments = await database
      .collection("investmentUsers")
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userDMFID",
            foreignField: "uniqueId",
            as: "userDetails",
          },
        },
        { $unwind: "$userDetails" },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();

    res.json(investments);
  } catch (error) {
    console.error("Error fetching all investments:", error);
    res.status(500).json({ message: "সার্ভার ত্রুটি হয়েছে" });
  }
};

// Delete investment
const deleteInvestment = async (req, res) => {
  try {
    const { investmentID } = req.params;
    const database = getDatabase();

    const result = await database
      .collection("investmentUsers")
      .deleteOne({ investmentID });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Investment not found" });
    }

    res.json({ message: "Investment deleted successfully" });
  } catch (error) {
    console.error("Error deleting investment:", error);
    res.status(500).json({ message: "সার্ভার ত্রুটি হয়েছে" });
  }
};

// Update investment
const updateInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const { pinCode, numberOfShares } = req.body;
    const database = getDatabase();

    if (!pinCode || numberOfShares == null) {
      return res.status(400).json({ message: "সঠিক তথ্য প্রয়োজন" });
    }

    const updateResult = await database
      .collection("investmentUsers")
      .updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            pinCode,
            numberOfShares,
            updatedAt: new Date(),
          },
        }
      );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ message: "Investment not found" });
    }

    res.json({ message: "Investment updated successfully" });
  } catch (error) {
    console.error("Error updating investment:", error);
    res.status(500).json({ message: "সার্ভার ত্রুটি হয়েছে" });
  }
};

// Add deposit to investment
const addInvestmentDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, amount, paymentMethod, transactionID } = req.body;
    const database = getDatabase();

    if (!date || !amount || !paymentMethod) {
      return res.status(400).json({ message: "সঠিক তথ্য প্রয়োজন" });
    }

    const depositEntry = {
      date,
      amount,
      paymentMethod,
      transactionID: transactionID || null,
    };

    const updateResult = await database
      .collection("investmentUsers")
      .updateOne(
        { _id: new ObjectId(id) },
        {
          $push: { depositInfo: depositEntry },
          $set: { updatedAt: new Date() },
        }
      );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ message: "Investment not found" });
    }

    res.status(201).json({ message: "Deposit added successfully" });
  } catch (error) {
    console.error("Error adding deposit:", error);
    res.status(500).json({ message: "সার্ভার ত্রুটি হয়েছে" });
  }
};

module.exports = {
  registerInvestment,
  getLastInvestmentId,
  getInvestmentById,
  getAllInvestmentUsers,
  deleteInvestment,
  updateInvestment,
  addInvestmentDeposit,
};
