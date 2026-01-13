const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  register,
  forgotPassword,
  changePassword,
  login,
  getUserInfo,
  logout,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/forgot-password", forgotPassword);
router.post("/change-password", verifyAuthToken, changePassword);
router.post("/login", login);
router.post("/logout", verifyAuthToken, logout);
router.get("/userinfo", getUserInfo);

module.exports = router;
