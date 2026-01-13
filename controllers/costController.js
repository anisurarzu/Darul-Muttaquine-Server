const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Create cost info
const createCostInfo = async (req, res) => {
  try {
    const {
      amount,
      userName,
      userID,
      dmfID,
      invoice,
      paymentMethod,
      project,
      description,
      status,
      phone,
      reason,
    } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const database = getDatabase();
    const result = await database.collection("costInfo").insertOne({
      amount,
      userName,
      userID,
      invoice,
      dmfID,
      paymentMethod,
      project,
      description,
      status,
      phone,
      reason,
      requestDate: new Date(),
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

// Create cost info 2
const createCostInfo2 = async (req, res) => {
  try {
    const {
      scholarshipID,
      amount,
      paymentMethod,
      fundName,
      currentBalance,
      description,
      status,
      phone,
    } = req.body;

    if (
      !scholarshipID ||
      !amount ||
      !paymentMethod ||
      !fundName ||
      currentBalance === undefined
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const database = getDatabase();
    const costResult = await database.collection("costInfo").insertOne({
      amount,
      userName: "Scholarship System",
      userID: scholarshipID,
      invoice: "",
      dmfID: scholarshipID,
      paymentMethod,
      project: "Scholarship 2025 Ceremony",
      description: description || "Scholarship fund expense",
      status: status || "pending",
      phone: phone || "",
      reason: "Scholarship Fund",
      requestDate: new Date(),
    });

    if (!costResult.acknowledged) {
      return res.status(500).json({ message: "Failed to insert cost info" });
    }

    const scholarshipResult = await database
      .collection("scholarshipCostInfo")
      .insertOne({
        scholarshipID,
        amount,
        paymentMethod,
        fundName,
        currentBalance,
        requestDate: new Date(),
      });

    if (!scholarshipResult.acknowledged) {
      return res
        .status(500)
        .json({ message: "Cost inserted, but scholarship cost failed" });
    }

    res.status(200).json({
      message: "Cost and scholarship cost info submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting info:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Add cost file
const addCostFile = async (req, res) => {
  try {
    const { file, id } = req.body;
    const database = getDatabase();

    const cost = await database
      .collection("costInfo")
      .findOne({ _id: ObjectId(id) });
    if (!cost) {
      return res
        .status(404)
        .json({ message: "Deposit History not found!" });
    }

    await database.collection("costInfo").updateOne(
      { _id: ObjectId(id) },
      {
        $set: { file, fileAttachedDate: new Date() },
      }
    );

    const updatedCost = await database
      .collection("costInfo")
      .findOne({ _id: ObjectId(id) });

    res.status(200).json({
      message: "Status updated successfully",
      user: updatedCost,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update cost status
const updateCostStatus = async (req, res) => {
  try {
    const { status, project, id } = req.body;
    const database = getDatabase();

    const cost = await database
      .collection("costInfo")
      .findOne({ _id: ObjectId(id) });
    if (!cost) {
      return res
        .status(404)
        .json({ message: "Deposit History not found!" });
    }

    const acceptedDate = new Date();
    await database.collection("costInfo").updateOne(
      { _id: ObjectId(id) },
      {
        $set: { status, acceptedDate, project, acceptedDate },
      }
    );

    const updatedCost = await database
      .collection("costInfo")
      .findOne({ _id: ObjectId(id) });

    res.status(200).json({
      message: "Status updated successfully",
      user: updatedCost,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all cost info
const getAllCostInfo = async (req, res) => {
  try {
    const database = getDatabase();
    const users = await database.collection("costInfo").find().toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get cost info by user ID
const getCostInfoByUserId = async (req, res) => {
  try {
    const { userID } = req.params;
    const database = getDatabase();

    const users = await database
      .collection("costInfo")
      .find({ userID: userID })
      .toArray();

    if (users.length === 0) {
      return res.status(404).json({ message: "No cost info found" });
    }

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete cost info
const deleteCostInfo = async (req, res) => {
  try {
    const id = req.params.id;
    const database = getDatabase();

    const result = await database.collection("costInfo").deleteOne({
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

// Scholarship cost info controllers
const createScholarshipCostInfo = async (req, res) => {
  try {
    const {
      scholarshipID,
      amount,
      paymentMethod,
      fundName,
      currentBalance,
    } = req.body;

    if (
      !scholarshipID ||
      !amount ||
      !paymentMethod ||
      !fundName ||
      currentBalance === undefined
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const database = getDatabase();
    const result = await database
      .collection("scholarshipCostInfo")
      .insertOne({
        scholarshipID,
        amount,
        paymentMethod,
        fundName,
        currentBalance,
        requestDate: new Date(),
      });

    if (!result.acknowledged) {
      return res.status(500).json({ message: "Failed to insert data" });
    }

    res
      .status(201)
      .json({ message: "Scholarship cost info submitted successfully" });
  } catch (error) {
    console.error("Error inserting scholarship cost info:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateScholarshipCostStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const database = getDatabase();

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const result = await database
      .collection("scholarshipCostInfo")
      .updateOne({ _id: new ObjectId(id) }, { $set: { status } });

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: "Update failed or no record found" });
    }

    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getAllScholarshipCostInfo = async (req, res) => {
  try {
    const database = getDatabase();
    const result = await database
      .collection("scholarshipCostInfo")
      .find({})
      .toArray();
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching cost info:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getScholarshipCostInfoByScholarshipId = async (req, res) => {
  try {
    const { scholarshipID } = req.params;
    const database = getDatabase();

    if (!scholarshipID) {
      return res
        .status(400)
        .json({ message: "Scholarship ID is required" });
    }

    const result = await database
      .collection("scholarshipCostInfo")
      .find({ scholarshipID })
      .toArray();

    if (result.length === 0) {
      return res
        .status(404)
        .json({ message: "No cost info found for this scholarship ID" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching data by scholarshipID:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const deleteScholarshipCostInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const database = getDatabase();

    const result = await database
      .collection("scholarshipCostInfo")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No data found to delete" });
    }

    res
      .status(200)
      .json({ message: "Scholarship cost info deleted successfully" });
  } catch (error) {
    console.error("Error deleting scholarship cost info:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createCostInfo,
  createCostInfo2,
  addCostFile,
  updateCostStatus,
  getAllCostInfo,
  getCostInfoByUserId,
  deleteCostInfo,
  createScholarshipCostInfo,
  updateScholarshipCostStatus,
  getAllScholarshipCostInfo,
  getScholarshipCostInfoByScholarshipId,
  deleteScholarshipCostInfo,
};
