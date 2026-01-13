const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Create suggestion
const createSuggestion = async (req, res) => {
  try {
    const { title, description } = req.body;
    const database = getDatabase();

    const result = await database.collection("suggestions").insertOne({
      title,
      description,
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

// Get all suggestions
const getSuggestions = async (req, res) => {
  try {
    const database = getDatabase();
    const suggestionInfo = await database
      .collection("suggestions")
      .find()
      .toArray();
    res.status(200).json(suggestionInfo);
  } catch (error) {
    console.error("Error retrieving suggestions information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete suggestion by ID
const deleteSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const database = getDatabase();

    const result = await database
      .collection("suggestions")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Information not found" });
    }

    res.status(200).json({ message: "Information deleted successfully" });
  } catch (error) {
    console.error("Error deleting information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createSuggestion,
  getSuggestions,
  deleteSuggestion,
};
