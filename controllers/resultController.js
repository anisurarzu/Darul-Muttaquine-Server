const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Add result
const addResult = async (req, res) => {
  try {
    const { scholarshipRollNumber, resultDetails } = req.body;

    if (!scholarshipRollNumber || !resultDetails) {
      return res.status(400).json({
        message: "scholarshipRollNumber and resultDetails are required",
      });
    }

    const userId = req.userId;
    const database = getDatabase();

    const scholarship = await database
      .collection("scholarshipV26")
      .findOne({ scholarshipRollNumber: scholarshipRollNumber });

    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    const existingResultIndex =
      scholarship.resultDetails?.findIndex(
        (detail) => detail.scholarshipRollNumber === scholarshipRollNumber
      ) ?? -1;

    let updateOperation;
    let message = "Result details added successfully";

    if (existingResultIndex >= 0) {
      updateOperation = {
        $set: {
          userId: ObjectId(userId),
          [`resultDetails.${existingResultIndex}`]: resultDetails,
        },
      };
      message = "Result details updated successfully (previously existed)";
    } else {
      updateOperation = {
        $set: { userId: ObjectId(userId) },
        $push: { resultDetails: resultDetails },
      };
    }

    const result = await database
      .collection("scholarshipV26")
      .updateOne(
        { scholarshipRollNumber: scholarshipRollNumber },
        updateOperation
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    if (result.modifiedCount === 0) {
      console.error("Failed to update result details in the database");
      return res
        .status(500)
        .json({ message: "Failed to add/update result details" });
    }

    res.status(200).json({ message });
  } catch (error) {
    console.error("Error adding/updating result details:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update course fund
const updateCourseFund = async (req, res) => {
  try {
    const { scholarshipRollNumber, courseFund } = req.body;

    if (!scholarshipRollNumber || courseFund === undefined) {
      return res.status(400).json({
        message: "scholarshipRollNumber and courseFund are required",
      });
    }

    const userId = req.userId;
    const database = getDatabase();

    const scholarship = await database
      .collection("scholarshipV26")
      .findOne({ scholarshipRollNumber: scholarshipRollNumber });

    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    const existingResultIndex =
      scholarship.resultDetails?.findIndex(
        (detail) => detail.scholarshipRollNumber === scholarshipRollNumber
      ) ?? -1;

    if (existingResultIndex === -1) {
      return res.status(404).json({
        message: "No result details found for this scholarship",
      });
    }

    const result = await database.collection("scholarshipV26").updateOne(
      { scholarshipRollNumber: scholarshipRollNumber },
      {
        $set: {
          userId: ObjectId(userId),
          [`resultDetails.${existingResultIndex}.courseFund`]: courseFund,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    if (result.modifiedCount === 0) {
      console.error("Failed to update course fund in the database");
      return res
        .status(500)
        .json({ message: "Failed to update course fund" });
    }

    res.status(200).json({
      message: "Course fund updated successfully",
      updatedCourseFund: courseFund,
    });
  } catch (error) {
    console.error("Error updating course fund:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Search result
const searchResult = async (req, res) => {
  try {
    const { scholarshipRollNumber } = req.params;
    const database = getDatabase();
    const collection = database.collection("scholarshipV26");

    const doc = await collection.findOne({ scholarshipRollNumber });
    if (!doc) {
      return res.status(404).json({ message: "Result not found" });
    }

    await collection.updateOne(
      { scholarshipRollNumber },
      { $inc: { searchCount: 1 } }
    );

    const updatedDoc = await collection.findOne({ scholarshipRollNumber });

    res.status(200).json(updatedDoc);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get total searches
const getTotalSearches = async (req, res) => {
  try {
    const database = getDatabase();
    const collection = database.collection("scholarshipV26");

    const result = await collection
      .aggregate([
        {
          $group: {
            _id: null,
            totalSearches: { $sum: "$searchCount" },
          },
        },
      ])
      .toArray();

    const totalSearches = result.length > 0 ? result[0].totalSearches : 0;

    res.status(200).json({ totalSearches });
  } catch (error) {
    console.error("Error getting total searches:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  addResult,
  updateCourseFund,
  searchResult,
  getTotalSearches,
};
