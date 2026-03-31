const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

const QUESTION_LIMITS = {
  lessonQuiz: 5,
  moduleQuiz: 20,
  finalExam: 50,
};

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const toTrimmed = (v) => (typeof v === "string" ? v.trim() : v);

const withId = (obj, key = "_id") => ({
  [key]: new ObjectId().toString(),
  ...obj,
});

const normalizeQuestion = (q) => ({
  _id: q?._id || new ObjectId().toString(),
  question: toTrimmed(q?.question),
  options: Array.isArray(q?.options) ? q.options.map((o) => toTrimmed(o)) : [],
  correctAnswer: toTrimmed(q?.correctAnswer),
  explanation: toTrimmed(q?.explanation) || "",
});

const validateQuestion = (question, index = 0) => {
  if (!question || typeof question !== "object") {
    return `Question #${index + 1} must be an object`;
  }
  if (!isNonEmptyString(question.question)) {
    return `Question #${index + 1} must have a non-empty "question"`;
  }
  if (!Array.isArray(question.options) || question.options.length !== 4) {
    return `Question #${index + 1} must have exactly 4 options`;
  }
  const hasEmptyOption = question.options.some((o) => !isNonEmptyString(o));
  if (hasEmptyOption) {
    return `Question #${index + 1} has empty option text`;
  }
  if (!isNonEmptyString(question.correctAnswer)) {
    return `Question #${index + 1} must have "correctAnswer"`;
  }
  if (!question.options.includes(question.correctAnswer)) {
    return `Question #${index + 1} correctAnswer must match one option`;
  }
  return null;
};

const validateQuiz = (quiz, expectedCount, label) => {
  if (!Array.isArray(quiz)) {
    return `${label} must be an array`;
  }
  if (quiz.length !== expectedCount) {
    return `${label} must contain exactly ${expectedCount} questions`;
  }
  for (let i = 0; i < quiz.length; i++) {
    const err = validateQuestion(quiz[i], i);
    if (err) return `${label}: ${err}`;
  }
  return null;
};

const normalizeQuiz = (quiz) => quiz.map((q) => normalizeQuestion(q));

const validateLesson = (lesson, moduleIndex = 0, lessonIndex = 0) => {
  if (!lesson || typeof lesson !== "object") {
    return `Module #${moduleIndex + 1} Lesson #${lessonIndex + 1} must be an object`;
  }
  if (!isNonEmptyString(lesson.title)) {
    return `Module #${moduleIndex + 1} Lesson #${lessonIndex + 1} must have title`;
  }
  if (!isNonEmptyString(lesson.content)) {
    return `Module #${moduleIndex + 1} Lesson #${lessonIndex + 1} must have content`;
  }
  if (lesson.quiz != null) {
    const qErr = validateQuiz(
      lesson.quiz,
      QUESTION_LIMITS.lessonQuiz,
      `Module #${moduleIndex + 1} Lesson #${lessonIndex + 1} quiz`
    );
    if (qErr) return qErr;
  }
  return null;
};

const normalizeLesson = (lesson) =>
  withId(
    {
      title: toTrimmed(lesson.title),
      content: toTrimmed(lesson.content),
      quiz: Array.isArray(lesson.quiz) ? normalizeQuiz(lesson.quiz) : [],
    },
    "lessonId"
  );

const validateModule = (module, moduleIndex = 0) => {
  if (!module || typeof module !== "object") {
    return `Module #${moduleIndex + 1} must be an object`;
  }
  if (!isNonEmptyString(module.title)) {
    return `Module #${moduleIndex + 1} must have title`;
  }
  if (!isNonEmptyString(module.description)) {
    return `Module #${moduleIndex + 1} must have description`;
  }
  if (!Array.isArray(module.lessons)) {
    return `Module #${moduleIndex + 1} must have lessons array`;
  }
  for (let j = 0; j < module.lessons.length; j++) {
    const lErr = validateLesson(module.lessons[j], moduleIndex, j);
    if (lErr) return lErr;
  }
  if (module.moduleQuiz != null) {
    const qErr = validateQuiz(
      module.moduleQuiz,
      QUESTION_LIMITS.moduleQuiz,
      `Module #${moduleIndex + 1} moduleQuiz`
    );
    if (qErr) return qErr;
  }
  return null;
};

const normalizeModule = (module) =>
  withId(
    {
      title: toTrimmed(module.title),
      description: toTrimmed(module.description),
      lessons: module.lessons.map((lesson) => normalizeLesson(lesson)),
      moduleQuiz: Array.isArray(module.moduleQuiz)
        ? normalizeQuiz(module.moduleQuiz)
        : [],
    },
    "moduleId"
  );

const buildInstructor = (body) => {
  const instructorObj = body.instructor && typeof body.instructor === "object"
    ? {
        name: toTrimmed(body.instructor.name),
        image: toTrimmed(body.instructor.image) || "",
        qualification: toTrimmed(body.instructor.qualification) || "",
      }
    : null;

  if (instructorObj?.name) return instructorObj;

  return {
    name: toTrimmed(body.instructorName),
    image: toTrimmed(body.instructorImage) || "",
    qualification: toTrimmed(body.qualifications) || "",
  };
};

const getCourseOr404 = async (database, courseId, res) => {
  if (!ObjectId.isValid(courseId)) {
    res.status(400).json({ success: false, message: "Invalid courseId" });
    return null;
  }
  const course = await database
    .collection("courses")
    .findOne({ _id: new ObjectId(courseId) });
  if (!course) {
    res.status(404).json({ success: false, message: "Course not found" });
    return null;
  }
  return course;
};

// Create course with full LMS structure
const createCourse = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      startDate,
      endDate,
      duration,
      availableSeats,
      batchNumber,
      qualifications,
      certifications,
      image,
      modules = [],
      finalExam = [],
    } = req.body;

    const instructor = buildInstructor(req.body);

    if (
      !isNonEmptyString(title) ||
      !isNonEmptyString(category) ||
      !isNonEmptyString(description) ||
      !isNonEmptyString(instructor.name) ||
      !startDate ||
      !endDate ||
      !duration ||
      availableSeats == null ||
      !batchNumber
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    if (!Array.isArray(modules)) {
      return res.status(400).json({
        success: false,
        message: "modules must be an array",
      });
    }

    for (let i = 0; i < modules.length; i++) {
      const mErr = validateModule(modules[i], i);
      if (mErr) {
        return res.status(400).json({ success: false, message: mErr });
      }
    }

    const finalExamErr = validateQuiz(
      finalExam,
      QUESTION_LIMITS.finalExam,
      "finalExam"
    );
    if (finalExamErr) {
      return res.status(400).json({ success: false, message: finalExamErr });
    }

    const database = getDatabase();
    const courseDoc = {
      title: toTrimmed(title),
      category: toTrimmed(category),
      description: toTrimmed(description),
      image: toTrimmed(image) || "",
      startDate,
      endDate,
      duration,
      availableSeats: Number(availableSeats),
      batchNumber,
      qualifications: toTrimmed(qualifications) || "",
      certifications: toTrimmed(certifications) || "",
      instructor,
      modules: modules.map((m) => normalizeModule(m)),
      finalExam: normalizeQuiz(finalExam),
      enrollments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await database.collection("courses").insertOne(courseDoc);

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      courseId: result.insertedId,
      course: courseDoc,
    });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get all courses
const getAllCourses = async (req, res) => {
  try {
    const database = getDatabase();
    const courses = await database.collection("courses").find().toArray();
    res.status(200).json({ success: true, courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get course by ID
const getCourseById = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid course id" });
    }
    const database = getDatabase();
    const course = await database
      .collection("courses")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({ success: true, course });
  } catch (error) {
    console.error("Error fetching course by ID:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Update course (supports nested modules/lessons/quizzes/final exam)
const updateCourse = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid course id" });
    }

    const payload = req.body || {};
    const setDoc = { updatedAt: new Date() };

    const topLevelFields = [
      "title",
      "category",
      "description",
      "startDate",
      "endDate",
      "duration",
      "availableSeats",
      "batchNumber",
      "qualifications",
      "certifications",
      "image",
    ];
    topLevelFields.forEach((field) => {
      if (payload[field] !== undefined) setDoc[field] = payload[field];
    });

    if (payload.instructor !== undefined || payload.instructorName !== undefined) {
      setDoc.instructor =
        payload.instructor && typeof payload.instructor === "object"
          ? payload.instructor
          : buildInstructor(payload);
    }

    // No restriction for nested update payload.
    if (payload.modules !== undefined) setDoc.modules = payload.modules;
    if (payload.finalExam !== undefined) setDoc.finalExam = payload.finalExam;

    const database = getDatabase();
    const result = await database.collection("courses").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: setDoc }
    );

    if (!result.matchedCount) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Add module to course
const addModuleToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const moduleData = req.body;
    const moduleErr = validateModule(moduleData, 0);
    if (moduleErr) {
      return res.status(400).json({ success: false, message: moduleErr });
    }

    const database = getDatabase();
    const course = await getCourseOr404(database, courseId, res);
    if (!course) return;

    const moduleDoc = normalizeModule(moduleData);
    const result = await database.collection("courses").updateOne(
      { _id: course._id },
      {
        $push: { modules: moduleDoc },
        $set: { updatedAt: new Date() },
      }
    );

    if (!result.modifiedCount) {
      return res.status(500).json({ success: false, message: "Failed to add module" });
    }

    res.status(200).json({
      success: true,
      message: "Module added successfully",
      module: moduleDoc,
    });
  } catch (error) {
    console.error("Error adding module:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Add lesson to module
const addLessonToModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const lessonData = req.body;
    const lessonErr = validateLesson(lessonData, 0, 0);
    if (lessonErr) {
      return res.status(400).json({ success: false, message: lessonErr });
    }

    const database = getDatabase();
    const course = await getCourseOr404(database, courseId, res);
    if (!course) return;

    const modules = Array.isArray(course.modules) ? [...course.modules] : [];
    const moduleIndex = modules.findIndex((m) => m.moduleId === moduleId);
    if (moduleIndex === -1) {
      return res.status(404).json({ success: false, message: "Module not found" });
    }

    const lessonDoc = normalizeLesson(lessonData);
    const lessons = Array.isArray(modules[moduleIndex].lessons)
      ? [...modules[moduleIndex].lessons]
      : [];
    lessons.push(lessonDoc);
    modules[moduleIndex].lessons = lessons;

    await database.collection("courses").updateOne(
      { _id: course._id },
      { $set: { modules, updatedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: "Lesson added successfully",
      lesson: lessonDoc,
    });
  } catch (error) {
    console.error("Error adding lesson:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Add/replace lesson quiz (5 questions)
const addLessonQuiz = async (req, res) => {
  try {
    const { courseId, moduleId, lessonId } = req.params;
    const { quiz } = req.body;
    const qErr = validateQuiz(quiz, QUESTION_LIMITS.lessonQuiz, "lesson quiz");
    if (qErr) {
      return res.status(400).json({ success: false, message: qErr });
    }

    const database = getDatabase();
    const course = await getCourseOr404(database, courseId, res);
    if (!course) return;

    const modules = Array.isArray(course.modules) ? [...course.modules] : [];
    const moduleIndex = modules.findIndex((m) => m.moduleId === moduleId);
    if (moduleIndex === -1) {
      return res.status(404).json({ success: false, message: "Module not found" });
    }

    const lessons = Array.isArray(modules[moduleIndex].lessons)
      ? [...modules[moduleIndex].lessons]
      : [];
    const lessonIndex = lessons.findIndex((l) => l.lessonId === lessonId);
    if (lessonIndex === -1) {
      return res.status(404).json({ success: false, message: "Lesson not found" });
    }

    lessons[lessonIndex].quiz = normalizeQuiz(quiz);
    modules[moduleIndex].lessons = lessons;

    await database.collection("courses").updateOne(
      { _id: course._id },
      { $set: { modules, updatedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: "Lesson quiz saved successfully",
      quiz: lessons[lessonIndex].quiz,
    });
  } catch (error) {
    console.error("Error saving lesson quiz:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Add/replace module exam (20 questions)
const addModuleExam = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { moduleQuiz } = req.body;
    const qErr = validateQuiz(
      moduleQuiz,
      QUESTION_LIMITS.moduleQuiz,
      "moduleQuiz"
    );
    if (qErr) {
      return res.status(400).json({ success: false, message: qErr });
    }

    const database = getDatabase();
    const course = await getCourseOr404(database, courseId, res);
    if (!course) return;

    const modules = Array.isArray(course.modules) ? [...course.modules] : [];
    const moduleIndex = modules.findIndex((m) => m.moduleId === moduleId);
    if (moduleIndex === -1) {
      return res.status(404).json({ success: false, message: "Module not found" });
    }

    modules[moduleIndex].moduleQuiz = normalizeQuiz(moduleQuiz);

    await database.collection("courses").updateOne(
      { _id: course._id },
      { $set: { modules, updatedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: "Module exam saved successfully",
      moduleQuiz: modules[moduleIndex].moduleQuiz,
    });
  } catch (error) {
    console.error("Error saving module exam:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Add/replace final exam (50 questions)
const addFinalExam = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { finalExam } = req.body;
    const qErr = validateQuiz(finalExam, QUESTION_LIMITS.finalExam, "finalExam");
    if (qErr) {
      return res.status(400).json({ success: false, message: qErr });
    }

    const database = getDatabase();
    const course = await getCourseOr404(database, courseId, res);
    if (!course) return;

    const normalized = normalizeQuiz(finalExam);
    await database.collection("courses").updateOne(
      { _id: course._id },
      { $set: { finalExam: normalized, updatedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: "Final exam saved successfully",
      finalExam: normalized,
    });
  } catch (error) {
    console.error("Error saving final exam:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Delete course
const deleteCourse = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid course id" });
    }
    const database = getDatabase();
    const result = await database
      .collection("courses")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    if (!result.deletedCount) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Enroll in course (prevents duplicate enrollment)
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
      !isNonEmptyString(name) ||
      !isNonEmptyString(lastInstitute) ||
      !isNonEmptyString(studentClass) ||
      !isNonEmptyString(scholarshipRollNumber) ||
      !isNonEmptyString(phone) ||
      !isNonEmptyString(paymentMethod)
    ) {
      return res.status(400).json({ success: false, message: "Required fields are missing" });
    }

    const database = getDatabase();
    const course = await getCourseOr404(database, courseId, res);
    if (!course) return;

    const enrollments = Array.isArray(course.enrollments) ? course.enrollments : [];
    const isAlreadyEnrolled = enrollments.some((enrollment) => {
      return (
        (enrollment.phone && enrollment.phone === phone) ||
        (enrollment.scholarshipRollNumber &&
          enrollment.scholarshipRollNumber === scholarshipRollNumber) ||
        (email && enrollment.email && enrollment.email === email)
      );
    });

    if (isAlreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: "This student is already enrolled in this course",
      });
    }

    if (Number(course.availableSeats || 0) <= 0) {
      return res.status(400).json({
        success: false,
        message: "No available seats for this course",
      });
    }

    const finalTransactionNumber =
      paymentMethod === "ScholarshipCoupon" ? "ScholarshipCoupon" : transactionNumber;

    if (paymentMethod !== "Cash" && !isNonEmptyString(finalTransactionNumber)) {
      return res.status(400).json({
        success: false,
        message: "Transaction number is required for non-cash payments",
      });
    }

    const enrollmentData = {
      _id: new ObjectId().toString(),
      name: toTrimmed(name),
      parentsName: toTrimmed(parentsName) || "",
      lastInstitute: toTrimmed(lastInstitute),
      class: toTrimmed(studentClass),
      scholarshipRollNumber: toTrimmed(scholarshipRollNumber),
      phone: toTrimmed(phone),
      email: toTrimmed(email) || "",
      paymentMethod: toTrimmed(paymentMethod),
      transactionNumber: toTrimmed(finalTransactionNumber) || "",
      enrolledAt: new Date(),
    };

    const updateResult = await database.collection("courses").updateOne(
      { _id: course._id, availableSeats: { $gt: 0 } },
      {
        $push: { enrollments: enrollmentData },
        $inc: { availableSeats: -1 },
        $set: { updatedAt: new Date() },
      }
    );

    if (!updateResult.modifiedCount) {
      return res.status(500).json({
        success: false,
        message: "Failed to enroll in the course",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully enrolled in ${course.title}`,
      enrollment: enrollmentData,
    });
  } catch (error) {
    console.error("Error enrolling in course:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  addModuleToCourse,
  addLessonToModule,
  addLessonQuiz,
  addModuleExam,
  addFinalExam,
};
