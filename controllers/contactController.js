const { getDatabase } = require("../config/database");

// Create contact info
const createContactInfo = async (req, res) => {
  try {
    const contactInfo = req.body;
    const database = getDatabase();

    const result = await database
      .collection("contactInfo")
      .insertOne(contactInfo);

    res.status(200).json({
      message: "Information submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting information:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all contact info
const getAllContactInfo = async (req, res) => {
  try {
    const database = getDatabase();
    const orders = await database
      .collection("contactInfo")
      .find()
      .toArray();
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createContactInfo,
  getAllContactInfo,
};
