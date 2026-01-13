const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");
const { generateToken } = require("../utils/jwt");
const { generateUniqueID, generateResetToken } = require("../utils/helpers");
const {
  sendVerificationEmail,
  generateVerificationToken,
} = require("../utils/email");
const { verifyToken } = require("../middleware/auth");
const nodemailer = require("nodemailer");

// Register user
const register = async (req, res) => {
  try {
    const { firstName, lastName, username, email, password } = req.body;
    const database = getDatabase();

    const existingUser = await database
      .collection("users")
      .findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const verificationToken = generateVerificationToken();
    const hashedPassword = await bcrypt.hash(password, 10);
    const uniqueId = await generateUniqueID();

    await database.collection("users").insertOne({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      verificationToken,
      userRole: "Visitor",
      createdAt: new Date(),
      uniqueId,
    });

    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const database = getDatabase();

    const user = await database.collection("users").findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const resetToken = generateResetToken();

    await database.collection("users").updateOne(
      { email },
      {
        $set: {
          resetToken,
          resetTokenExpires: new Date(Date.now() + 3600000),
        },
      }
    );

    await sendResetEmail(email, resetToken);

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Send reset email
async function sendResetEmail(email, resetToken) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "your-email@gmail.com",
      pass: "your-email-password",
    },
  });

  const mailOptions = {
    from: "your-email@gmail.com",
    to: email,
    subject: "Password Reset Request",
    text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
    Please click on the following link, or paste this into your browser to complete the process:\n\n
    http://localhost:3000/reset/${resetToken}\n\n
    If you did not request this, please ignore this email and your password will remain unchanged.\n`,
  };

  await transporter.sendMail(mailOptions);
}

// Change password
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, storePassword, email } = req.body;
    const database = getDatabase();

    const user = await database.collection("users").findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await database.collection("users").updateOne(
      { email },
      {
        $set: {
          password: hashedNewPassword,
          storePassword: storePassword,
        },
      }
    );

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const database = getDatabase();

    const user = await database.collection("users").findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "ভুল ইমেইল",
        field: "email",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "ভুল পাসওয়ার্ড",
        field: "password",
      });
    }

    if (!user.isVerification) {
      return res.status(403).json({
        success: false,
        message:
          "আপনার অ্যাকাউন্ট ভেরিফাই করা হয়নি। দয়া করে ভেরিফাই করার জন্য আমাদের সিস্টেম অ্যাডমিনিস্ট্রেটর সাদ্দাম হোসেন এর সাথে যোগাযোগ করুন। যোগাযোগ নম্বর: ০১৭৫৭৮২৪৫৩১",
        isVerification: false,
      });
    }

    // Update lastActive timestamp when user logs in
    const now = new Date();
    const updateResult = await database.collection("users").updateOne(
      { _id: user._id },
      { $set: { lastActive: now } }
    );
    
    // Log if update failed (for debugging)
    if (updateResult.modifiedCount === 0 && updateResult.matchedCount > 0) {
      console.log(`Warning: lastActive not updated for user ${user.email} (already set to same value)`);
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      isVerification: user.isVerification,
      message: "সফলভাবে লগইন হয়েছে!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Get user info
const getUserInfo = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: Token missing" });
    }

    const userId = verifyToken(token);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    const database = getDatabase();
    
    // Update lastActive timestamp when user fetches their info
    const now = new Date();
    await database.collection("users").updateOne(
      { _id: ObjectId(userId) },
      { $set: { lastActive: now } }
    );
    
    const user = await database
      .collection("users")
      .findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  register,
  forgotPassword,
  changePassword,
  login,
  getUserInfo,
};
