const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Create admission
const createAdmission = async (req, res) => {
  try {
    const {
      fullName,
      parentName,
      email,
      phone,
      gender,
      course,
      instituteName,
      class: className,
      dmfID,
    } = req.body;

    const database = getDatabase();
    const admissionNo = `ADM-${Math.floor(Math.random() * 100)
      .toString()
      .padStart(3, "0")}`;

    const result = await database.collection("admissions").insertOne({
      fullName,
      parentName,
      email,
      phone,
      gender,
      course,
      instituteName,
      className,
      dmfID,
      admissionDate: new Date(),
      admissionNo,
    });

    if (!result.insertedId) {
      console.error("Failed to insert information into the database");
      return res
        .status(500)
        .json({ message: "Failed to submit information" });
    }

    res.status(200).json({
      message: "Admission data submitted successfully",
      admissionNo,
    });
  } catch (error) {
    console.error("Error submitting admission data:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all admissions
const getAllAdmissions = async (req, res) => {
  try {
    const database = getDatabase();
    const admissions = await database
      .collection("admissions")
      .find()
      .toArray();
    res.status(200).json(admissions);
  } catch (error) {
    console.error("Error fetching admission data:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get admission by ID
const getAdmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const database = getDatabase();
    const admissionNo = id;

    const admission = await database
      .collection("admissions")
      .findOne({ admissionNo: admissionNo });

    if (!admission) {
      return res
        .status(404)
        .json({ message: "Admission record not found" });
    }

    res.status(200).json(admission);
  } catch (error) {
    console.error("Error fetching admission data:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update admission
const updateAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    const admissionNo = id;
    const {
      fullName,
      parentName,
      email,
      phone,
      gender,
      course,
      instituteName,
      class: className,
      dmfID,
    } = req.body;

    const database = getDatabase();
    const result = await database.collection("admissions").updateOne(
      { admissionNo: admissionNo },
      {
        $set: {
          fullName,
          parentName,
          email,
          phone,
          gender,
          course,
          instituteName,
          className,
          dmfID,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ message: "Admission record not found" });
    }

    res
      .status(200)
      .json({ message: "Admission data updated successfully" });
  } catch (error) {
    console.error("Error updating admission data:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete admission
const deleteAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    const admissionNo = id;
    const database = getDatabase();

    const result = await database
      .collection("admissions")
      .deleteOne({ admissionNo: admissionNo });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "Admission record not found" });
    }

    res
      .status(200)
      .json({ message: "Admission data deleted successfully" });
  } catch (error) {
    console.error("Error deleting admission data:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createAdmission,
  getAllAdmissions,
  getAdmissionById,
  updateAdmission,
  deleteAdmission,
};
