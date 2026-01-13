const express = require("express");
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollInCourse,
} = require("../controllers/courseController");

router.post("/courses", createCourse);
router.get("/courses", getAllCourses);
router.get("/courses/:id", getCourseById);
router.put("/courses/:id", updateCourse);
router.delete("/courses/:id", deleteCourse);
router.post("/enroll", enrollInCourse);

module.exports = router;
