const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Generate unique scholarship roll number
const generateUniqueScholarshipRollNumber = (lastEntry) => {
  const currentYear = new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2);

  let serialNumber = 1;

  if (lastEntry.length > 0) {
    const lastRollNumber = lastEntry[0].scholarshipRollNumber;
    const lastYear = lastRollNumber.slice(3, 5);

    if (lastYear === yearSuffix) {
      serialNumber = parseInt(lastRollNumber.slice(5)) + 1;
    }
  }

  const formattedSerial = String(serialNumber).padStart(2, "0");
  return `DMS${yearSuffix}${formattedSerial}`;
};

// Create scholarship
const createScholarship = async (req, res) => {
  try {
    const {
      name,
      parentName,
      instituteClass,
      institute,
      phone,
      gender,
      instituteRollNumber,
      presentAddress,
      bloodGroup,
      image,
      dateOfBirth,
      createdBy,
      createdByName,
    } = req.body;

    if (
      !name ||
      !institute ||
      !phone ||
      !gender ||
      !presentAddress ||
      !bloodGroup ||
      !dateOfBirth
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const database = getDatabase();
    const lastEntry = await database
      .collection("scholarshipV26")
      .find({ scholarshipRollNumber: { $regex: "^DMS" } })
      .sort({ submittedAt: -1 })
      .limit(1)
      .toArray();

    const scholarshipRollNumber = generateUniqueScholarshipRollNumber(lastEntry);
    const userId = req.userId;

    const result = await database.collection("scholarshipV26").insertOne({
      userId: ObjectId(userId),
      name,
      parentName,
      instituteClass,
      instituteRollNumber,
      scholarshipRollNumber,
      institute,
      phone,
      gender,
      presentAddress,
      bloodGroup,
      dateOfBirth,
      image,
      submittedAt: new Date(),
      createdBy,
      createdByName,
    });

    if (!result.insertedId) {
      return res
        .status(500)
        .json({ message: "Failed to submit information" });
    }

    res.status(201).json({
      message: "Information submitted successfully",
      scholarshipRollNumber,
    });
  } catch (error) {
    console.error("Error submitting information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all scholarships
const getAllScholarships = async (req, res) => {
  try {
    const database = getDatabase();
    const users = await database
      .collection("scholarshipV26")
      .find()
      .toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get old scholarships
const getOldScholarships = async (req, res) => {
  try {
    const database = getDatabase();
    const users = await database.collection("scholarship").find().toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get old 2025 scholarships
const getOld2025Scholarships = async (req, res) => {
  try {
    const database = getDatabase();
    const users = await database.collection("scholarshipNew").find().toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get scholarship by ID
const getScholarshipById = async (req, res) => {
  try {
    const scholarshipId = req.params.id;
    const database = getDatabase();

    if (!ObjectId.isValid(scholarshipId)) {
      return res.status(400).json({ message: "Invalid scholarship ID" });
    }

    const scholarship = await database
      .collection("scholarshipV26")
      .findOne({
        _id: ObjectId(scholarshipId),
      });

    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    res.status(200).json({ scholarship });
  } catch (error) {
    console.error("Error fetching scholarship information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update scholarship
const updateScholarship = async (req, res) => {
  try {
    const scholarshipId = req.params.id;
    const {
      name,
      image,
      parentName,
      instituteClass,
      instituteRollNumber,
      institute,
      phone,
      gender,
      presentAddress,
      bloodGroup,
      isSmsSend,
      isSeatPlaned,
      isAttendanceComplete,
      createdBy,
      createdByName,
      updatedBy,
      updatedByName,
    } = req.body;

    const database = getDatabase();
    const result = await database.collection("scholarshipV26").updateOne(
      { _id: ObjectId(scholarshipId) },
      {
        $set: {
          name,
          image,
          parentName,
          instituteClass,
          instituteRollNumber,
          institute,
          phone,
          gender,
          presentAddress,
          bloodGroup,
          isSmsSend,
          isSeatPlaned,
          isAttendanceComplete,
          updatedAt: new Date(),
          createdBy,
          createdByName,
          updatedBy,
          updatedByName,
        },
      }
    );

    if (result.modifiedCount !== 1) {
      return res.status(404).json({ message: "Information not found" });
    }

    res.status(200).json({ message: "Information updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete scholarship
const deleteScholarship = async (req, res) => {
  try {
    const scholarshipId = req.params.id;
    const database = getDatabase();

    const result = await database.collection("scholarshipV26").deleteOne({
      _id: ObjectId(scholarshipId),
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
  createScholarship,
  getAllScholarships,
  getOldScholarships,
  getOld2025Scholarships,
  getScholarshipById,
  updateScholarship,
  deleteScholarship,
};
