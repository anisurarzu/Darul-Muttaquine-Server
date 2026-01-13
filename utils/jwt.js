const jwt = require("jsonwebtoken");

// Function to generate JWT token
function generateToken(userId) {
  const secretKey = process.env.JWT_SECRET || "your-secret-key";
  const token = jwt.sign({ userId }, secretKey, { expiresIn: "5h" });
  return token;
}

module.exports = {
  generateToken,
};
