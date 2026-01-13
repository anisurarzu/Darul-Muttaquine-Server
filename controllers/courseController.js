const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Create course
const createCourse = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      instructorName,
      instructorImage,
      startDate,
      endDate,
      duration,
      availableSeats,
      batchNumber,
      qualifications,
      certifications,
      image,
    } = req.body;

    if (
      !title ||
      !category ||
      !description ||
      !instructorName ||
      !startDate ||
      !endDate ||
      !duration ||
      !availableSeats ||
      !batchNumber ||
      !qualifications ||
      !certifications
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const database = getDatabase();
    const result = await database.collection("courses").insertOne({
      title,
      category,
      description,
      instructorName,
      instructorImage,
      startDate,
      endDate,
      duration,
      availableSeats,
      batchNumber,
      qualifications,
      certifications,
      image,
      createdAt: new Date(),
    });

    if (!result) {
      console.error("Failed to insert information into the database");
      return res
        .status(500)
        .json({ message: "Failed to submit course information" });
    }

    res.status(200).json({ message: "Course created successfully" });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all courses
const getAllCourses = async (req, res) => {
  try {
    const database = getDatabase();
    const courses = await database.collection("courses").find().toArray();
    res.status(200).json({ courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get course by ID
const getCourseById = async (req, res) => {
  try {
    const database = getDatabase();
    const course = await database
      .collection("courses")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ course });
  } catch (error) {
    console.error("Error fetching course by ID:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update course
const updateCourse = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      instructorName,
      instructorImage,
      startDate,
      endDate,
      duration,
      availableSeats,
      batchNumber,
      qualifications,
      certifications,
      image,
    } = req.body;

    if (
      !title ||
      !category ||
      !description ||
      !instructorName ||
      !startDate ||
      !endDate ||
      !duration ||
      !availableSeats ||
      !batchNumber ||
      !qualifications ||
      !certifications ||
      !image ||
      !instructorImage
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const database = getDatabase();
    const result = await database.collection("courses").updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          title,
          category,
          description,
          instructorName,
          instructorImage,
          startDate,
          endDate,
          duration,
          availableSeats,
          batchNumber,
          qualifications,
          certifications,
          image,
        },
      }
    );

    if (!result.modifiedCount) {
      return res
        .status(404)
        .json({ message: "Course not found or no changes made" });
    }

    res.status(200).json({ message: "Course updated successfully" });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete course
const deleteCourse = async (req, res) => {
  try {
    const database = getDatabase();
    const result = await database
      .collection("courses")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    if (!result.deletedCount) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Enroll in course
const enrollInCourse = async (req, res) => {
  try {
    const {
      courseId,
      name,
      parentsName,
      lastInstitute,
      studentClass,
      scholarshipRollNumber,
      phone,
      email,
      paymentMethod,
      transactionNumber,
    } = req.body;

    if (
      !courseId ||
      !name ||
      !lastInstitute ||
      !studentClass ||
      !scholarshipRollNumber ||
      !phone ||
      !paymentMethod
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const database = getDatabase();
    const course = await database
      .collection("courses")
      .findOne({ _id: new ObjectId(courseId) });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const isAlreadyEnrolled = course.enrollments?.some(
      (enrollment) => enrollment.phone === phone
    );

    if (isAlreadyEnrolled) {
      return res.status(400).json({
        message: "This student is already enrolled in this course",
      });
    }

    if (course.availableSeats <= 0) {
      return res
        .status(400)
        .json({ message: "No available seats for this course" });
    }

    let newTransactionNumber;
    if (paymentMethod === "ScholarshipCoupon") {
      newTransactionNumber = "ScholarshipCoupon";
    } else {
      newTransactionNumber = transactionNumber;
    }

    if (paymentMethod !== "Cash" && !newTransactionNumber) {
      return res.status(400).json({
        message: "Transaction number is required for non-cash payments",
      });
    }

    const enrollmentData = {
      name,
      parentsName,
      lastInstitute,
      class: studentClass,
      phone,
      email,
      paymentMethod,
      transactionNumber: newTransactionNumber,
      enrolledAt: new Date(),
    };

    const updateResult = await database.collection("courses").updateOne(
      { _id: new ObjectId(courseId) },
      {
        $push: { enrollments: enrollmentData },
        $inc: { availableSeats: -1 },
      }
    );

    if (updateResult.modifiedCount > 0) {
      return res.status(200).json({
        message: `Successfully enrolled in ${course.title}`,
      });
    } else {
      return res.status(500).json({
        message: "Failed to enroll in the course",
      });
    }
  } catch (error) {
    console.error("Error enrolling in course:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollInCourse,
};
