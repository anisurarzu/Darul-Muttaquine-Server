const express = require("express");
const router = express.Router();
const {
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  createTask,
  submitTask,
  markTask,
  completeTask,
  getTasksByUserId,
} = require("../controllers/taskController");

router.get("/tasks", getAllTasks);
router.get("/tasks/:id", getTaskById);
router.put("/tasks/:id", updateTask);
router.delete("/tasks/:id", deleteTask);
router.post("/tasks", createTask);
router.post("/tasks/submit", submitTask);
router.patch("/tasks/:id/mark", markTask);
router.put("/tasks/:id/complete", completeTask);
router.get("/tasks/user/:userId", getTasksByUserId);

module.exports = router;
