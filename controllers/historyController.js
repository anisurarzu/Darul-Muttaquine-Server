const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");
const fs = require("fs");

// Upload file
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const database = getDatabase();
    const fileData = fs.readFileSync(req.file.path);
    const encodedFile = fileData.toString("base64");

    const imageDocument = {
      filename: req.file.filename,
      data: encodedFile,
      contentType: req.file.mimetype,
      historyName: req.body.historyName,
      historyDate: req.body.historyDate,
      historyDetails: req.body.historyDetails,
    };

    const result = await database
      .collection("historyInfo")
      .insertOne(imageDocument);

    if (!result) {
      console.error("Failed to insert image into the database");
      return res.status(500).json({ message: "Failed to store image" });
    }

    fs.unlinkSync(req.file.path);

    res.status(200).json({
      message: "File uploaded successfully",
      filename: req.file.filename,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Insert history info
const insertHistoryInfo = async (req, res) => {
  try {
    const { projectName, name, subtitle, description, image } = req.body;
    const database = getDatabase();

    const result = await database.collection("historyInfo").insertOne({
      projectName,
      name,
      subtitle,
      description,
      image,
      createdAt: new Date(),
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

// Get all uploaded files
const getAllFiles = async (req, res) => {
  try {
    const database = getDatabase();
    const files = await database
      .collection("historyInfo")
      .find({})
      .toArray();

    res.status(200).json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete uploaded file by ID
const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const database = getDatabase();

    const result = await database
      .collection("historyInfo")
      .deleteOne({ _id: ObjectId(fileId) });

    if (result.deletedCount !== 1) {
      return res.status(404).json({ message: "File not found" });
    }

    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get history info
const getHistoryInfo = async (req, res) => {
  try {
    const database = getDatabase();
    const historyInfo = await database
      .collection("historyInfo")
      .find()
      .toArray();
    res.status(200).json(historyInfo);
  } catch (error) {
    console.error("Error retrieving history information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete history info by ID
const deleteHistoryInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const database = getDatabase();

    const result = await database
      .collection("historyInfo")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      console.error("Failed to delete information from the database");
      return res.status(404).json({ message: "Information not found" });
    }

    res.status(200).json({ message: "Information deleted successfully" });
  } catch (error) {
    console.error("Error deleting information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  uploadFile,
  insertHistoryInfo,
  getAllFiles,
  deleteFile,
  getHistoryInfo,
  deleteHistoryInfo,
};
