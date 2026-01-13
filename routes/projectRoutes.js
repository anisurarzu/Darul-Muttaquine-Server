const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  createProject,
  updateProject,
  getAllProjects,
  updateProjectStatus,
  deleteProject,
} = require("../controllers/projectController");

router.post("/add-project-info", verifyAuthToken, createProject);
router.put("/update-project-info/:id", verifyAuthToken, updateProject);
router.get("/project-info", getAllProjects);
router.post("/update-project-status", verifyAuthToken, updateProjectStatus);
router.delete("/project-info/:id", verifyAuthToken, deleteProject);

module.exports = router;
