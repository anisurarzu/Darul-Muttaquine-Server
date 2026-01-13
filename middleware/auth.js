const jwt = require("jsonwebtoken");

// Function to verify JWT token
function verifyToken(token) {
  const secretKey = process.env.JWT_SECRET || "your-secret-key";
  try {
    const decoded = jwt.verify(token, secretKey);
    return decoded.userId;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// Middleware function to verify JWT token
function verifyAuthToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Pass the user ID to the next middleware or route handler
  req.userId = userId;
  next();
}

module.exports = {
  verifyAuthToken,
  verifyToken,
};
