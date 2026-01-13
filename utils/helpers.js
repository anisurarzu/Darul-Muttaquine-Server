const { getDatabase } = require("../config/database");

// Generate unique ID
const generateUniqueID = async () => {
  const database = getDatabase();
  let isUnique = false;
  let uniqueId;

  while (!isUnique) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    uniqueId = `DMF-${randomNum}`;
    const existingUser = await database
      .collection("users")
      .findOne({ uniqueId });
    if (!existingUser) {
      isUnique = true;
    }
  }
  return uniqueId;
};

// Generate reset token
const generateResetToken = () => {
  const crypto = require("crypto");
  return crypto.randomBytes(20).toString("hex");
};

module.exports = {
  generateUniqueID,
  generateResetToken,
};
