const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  getAllUsers,
  getUsersDropdown,
  updateUser,
  updateUserRole,
  updateUserProgress,
  deleteUser,
  getActiveUsers,
} = require("../controllers/userController");

router.get("/users", getAllUsers);
router.get("/usersDropdown", getUsersDropdown);
router.get("/active-users", getActiveUsers);
router.post("/update-user", verifyAuthToken, updateUser);
router.post("/update-user-role", verifyAuthToken, updateUserRole);
router.put("/update-user-progress", updateUserProgress);
router.delete("/user/:id", verifyAuthToken, deleteUser);

module.exports = router;
