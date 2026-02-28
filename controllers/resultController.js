const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Add result (Scholarship Roll No + Correct Answer; optional vibaMarks)
const addResult = async (req, res) => {
  try {
    const { scholarshipRollNumber, correctAnswer, vibaMarks } = req.body;

    if (!scholarshipRollNumber || correctAnswer === undefined) {
      return res.status(400).json({
        message: "scholarshipRollNumber and correctAnswer are required",
      });
    }

    const userId = req.userId;
    const database = getDatabase();

    const scholarship = await database
      .collection("scholarshipV26")
      .findOne({ scholarshipRollNumber });

    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    const updateFields = {
      userId: ObjectId(userId),
      correctAnswer,
      resultUpdatedAt: new Date(),
    };
    if (vibaMarks !== undefined) updateFields.vibaMarks = vibaMarks;

    const result = await database.collection("scholarshipV26").updateOne(
      { scholarshipRollNumber },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    const data = { scholarshipRollNumber, correctAnswer };
    if (vibaMarks !== undefined) data.vibaMarks = vibaMarks;

    res.status(200).json({
      success: true,
      message: "Result added successfully",
      data,
    });
  } catch (error) {
    console.error("Error adding result:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update course fund (separate from result, only two fields)
const updateCourseFund = async (req, res) => {
  try {
    const { scholarshipRollNumber, courseFund } = req.body;

    if (!scholarshipRollNumber || courseFund === undefined) {
      return res.status(400).json({
        message: "scholarshipRollNumber and courseFund are required",
      });
    }

    const userId = req.userId;
    const database = getDatabase();

    const result = await database.collection("scholarshipV26").updateOne(
      { scholarshipRollNumber },
      {
        $set: {
          userId: ObjectId(userId),
          courseFund,
          courseFundUpdatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    res.status(200).json({
      success: true,
      message: "Course fund updated successfully",
      data: {
        scholarshipRollNumber,
        courseFund,
      },
    });
  } catch (error) {
    console.error("Error updating course fund:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete result (removes correctAnswer for a scholarship)
const deleteResult = async (req, res) => {
  try {
    const { scholarshipRollNumber } = req.params;

    if (!scholarshipRollNumber) {
      return res.status(400).json({
        message: "scholarshipRollNumber is required",
      });
    }

    const database = getDatabase();

    const scholarship = await database
      .collection("scholarshipV26")
      .findOne({ scholarshipRollNumber });

    if (!scholarship) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    const result = await database.collection("scholarshipV26").updateOne(
      { scholarshipRollNumber },
      {
        $unset: {
          correctAnswer: "",
          resultUpdatedAt: "",
          vibaMarks: "",
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    res.status(200).json({
      success: true,
      message: "Result deleted successfully",
      data: {
        scholarshipRollNumber,
      },
    });
  } catch (error) {
    console.error("Error deleting result:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Search result
const searchResult = async (req, res) => {
  try {
    const { scholarshipRollNumber } = req.params;
    const database = getDatabase();
    const collection = database.collection("scholarshipV26");

    const doc = await collection.findOne({ scholarshipRollNumber });
    if (!doc) {
      return res.status(404).json({ message: "Result not found" });
    }

    await collection.updateOne(
      { scholarshipRollNumber },
      { $inc: { searchCount: 1 } }
    );

    const updatedDoc = await collection.findOne({ scholarshipRollNumber });

    res.status(200).json(updatedDoc);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get total searches
const getTotalSearches = async (req, res) => {
  try {
    const database = getDatabase();
    const collection = database.collection("scholarshipV26");

    const result = await collection
      .aggregate([
        {
          $group: {
            _id: null,
            totalSearches: { $sum: "$searchCount" },
          },
        },
      ])
      .toArray();

    const totalSearches = result.length > 0 ? result[0].totalSearches : 0;

    res.status(200).json({ totalSearches });
  } catch (error) {
    console.error("Error getting total searches:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Helper: parse marks/percentage from correctAnswer (can be number or string)
const parseMarks = (correctAnswer) => {
  if (correctAnswer == null) return null;
  const n = Number(correctAnswer);
  return Number.isFinite(n) ? n : null;
};

// Number words to digits so "Four", "four", "4" all become "4"
const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};

// Normalize instituteClass so 4, Four, four → same key for grouping
const normalizeClass = (instituteClass) => {
  if (instituteClass == null) return "Unknown";
  const s = String(instituteClass).trim();
  if (s === "") return "Unknown";
  const asNum = parseInt(s, 10);
  if (Number.isFinite(asNum)) return String(asNum);
  const lower = s.toLowerCase();
  if (NUMBER_WORDS[lower] != null) return String(NUMBER_WORDS[lower]);
  return lower;
};

// Get result statistics: ratios and counts (overall + class-wise)
// Present students = scholarshipV26 where isAttendanceComplete === true; result added = has correctAnswer
// Pass = 40% of total marks; 70% = 70% of total. Class 3–5 total = 45, others = 100.
const getResultStats = async (req, res) => {
  try {
    const database = getDatabase();
    const config = await getResultCalculationConfig(database);
    const collection = database.collection("scholarshipV26");

    const totalApplications = await collection.countDocuments({});

    const all = await collection
      .find({ isAttendanceComplete: true })
      .project({
        scholarshipRollNumber: 1,
        instituteClass: 1,
        correctAnswer: 1,
      })
      .toArray();

    const totalPresent = all.length;
    const totalPresentPercentOfApplications =
      totalApplications > 0
        ? Math.round((totalPresent / totalApplications) * 10000) / 100
        : 0;

    const withResult = all.filter((d) => d.correctAnswer != null);
    const resultAddedCount = withResult.length;
    const resultAddedRatio =
      totalPresent > 0
        ? Math.round((resultAddedCount / totalPresent) * 10000) / 100
        : 0;

    const passed = withResult.filter((d) => {
      const m = parseMarks(d.correctAnswer);
      const { passThreshold } = getThresholdsFromConfig(d.instituteClass, config);
      return m != null && m >= passThreshold;
    });
    const passCount = passed.length;
    const passRatioOverall =
      totalPresent > 0
        ? Math.round((passCount / totalPresent) * 10000) / 100
        : 0;
    const passRatioAmongResult =
      resultAddedCount > 0
        ? Math.round((passCount / resultAddedCount) * 10000) / 100
        : 0;

    const got70 = withResult.filter((d) => {
      const m = parseMarks(d.correctAnswer);
      const { got70Threshold } = getThresholdsFromConfig(d.instituteClass, config);
      return m != null && m >= got70Threshold;
    });
    const got70Count = got70.length;
    const got70RatioOverall =
      totalPresent > 0
        ? Math.round((got70Count / totalPresent) * 10000) / 100
        : 0;
    const got70RatioAmongResult =
      resultAddedCount > 0
        ? Math.round((got70Count / resultAddedCount) * 10000) / 100
        : 0;

    const GOT75_THRESHOLD_CLASS_3_TO_5 = config.class3To5.totalMarks * (config.class3To5.got75Percent / 100);
    const GOT75_THRESHOLD_CLASS_6_TO_12 = config.class6To12.totalMarks * (config.class6To12.got75Percent / 100);

    const byClassMap = new Map();

    for (const d of all) {
      const cls = normalizeClass(d.instituteClass);
      if (!byClassMap.has(cls)) {
        byClassMap.set(cls, {
          class: cls,
          totalPresent: 0,
          resultAddedCount: 0,
          passCount: 0,
          got70Count: 0,
          got75Count: 0,
        });
      }
      const row = byClassMap.get(cls);
      row.totalPresent += 1;
      if (d.correctAnswer != null) {
        row.resultAddedCount += 1;
        const m = parseMarks(d.correctAnswer);
        const { passThreshold, got70Threshold, got75Threshold } = getThresholdsFromConfig(d.instituteClass, config);
        if (m != null && m >= passThreshold) row.passCount += 1;
        if (m != null && m >= got70Threshold) row.got70Count += 1;
        if (m != null && m >= got75Threshold) row.got75Count += 1;
      }
    }

    const byClass = Array.from(byClassMap.values()).map((row) => {
      const totalPresent = row.totalPresent;
      const resultAddedCount = row.resultAddedCount;
      const passCount = row.passCount;
      const got70Count = row.got70Count;
      const got75Count = row.got75Count ?? 0;
      const totalMarks = CLASS_3_TO_5_SET.has(row.class) ? config.class3To5.totalMarks : config.class6To12.totalMarks;
      const out = {
        class: row.class,
        totalMarks,
        totalPresent,
        resultAddedCount,
        resultAddedRatioPercent:
          totalPresent > 0
            ? Math.round((resultAddedCount / totalPresent) * 10000) / 100
            : 0,
        passCount,
        passRatioPercent:
          totalPresent > 0
            ? Math.round((passCount / totalPresent) * 10000) / 100
            : 0,
        got70Count,
        got70RatioPercent:
          totalPresent > 0
            ? Math.round((got70Count / totalPresent) * 10000) / 100
            : 0,
      };
      out.got75Count = got75Count;
      out.got75RatioPercent =
        totalPresent > 0 ? Math.round((got75Count / totalPresent) * 10000) / 100 : 0;
      return out;
    });

    byClass.sort((a, b) => {
      const na = Number(a.class);
      const nb = Number(b.class);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return String(a.class).localeCompare(String(b.class));
    });

    const allClass3To5 = all.filter((d) => isClass3To5(d.instituteClass));
    const presentClass3To5 = allClass3To5.length;
    const withResultClass3To5 = allClass3To5.filter((d) => d.correctAnswer != null);
    const resultAddedClass3To5 = withResultClass3To5.length;
    const got75Class3To5 = withResultClass3To5.filter((d) => {
      const m = parseMarks(d.correctAnswer);
      return m != null && m >= GOT75_THRESHOLD_CLASS_3_TO_5;
    });
    const got75CountClass3To5 = got75Class3To5.length;
    const passCountClass3To5 = withResultClass3To5.filter((d) => {
      const m = parseMarks(d.correctAnswer);
      const { passThreshold } = getThresholdsFromConfig(d.instituteClass, config);
      return m != null && m >= passThreshold;
    }).length;
    const got70CountClass3To5 = withResultClass3To5.filter((d) => {
      const m = parseMarks(d.correctAnswer);
      const { got70Threshold } = getThresholdsFromConfig(d.instituteClass, config);
      return m != null && m >= got70Threshold;
    }).length;

    const class3To5 = {
      totalMarks: config.class3To5.totalMarks,
      totalPresent: presentClass3To5,
      resultAddedCount: resultAddedClass3To5,
      resultAddedRatioPercent:
        presentClass3To5 > 0
          ? Math.round((resultAddedClass3To5 / presentClass3To5) * 10000) / 100
          : 0,
      passCount: passCountClass3To5,
      passRatioPercent:
        presentClass3To5 > 0
          ? Math.round((passCountClass3To5 / presentClass3To5) * 10000) / 100
          : 0,
      got70Count: got70CountClass3To5,
      got70RatioPercent:
        presentClass3To5 > 0
          ? Math.round((got70CountClass3To5 / presentClass3To5) * 10000) / 100
          : 0,
      got75Count: got75CountClass3To5,
      got75RatioPercent:
        presentClass3To5 > 0
          ? Math.round((got75CountClass3To5 / presentClass3To5) * 10000) / 100
          : 0,
      byClass: byClass.filter((r) => CLASS_3_TO_5_SET.has(r.class)),
    };

    const allClass6To12 = all.filter((d) => !isClass3To5(d.instituteClass));
    const presentClass6To12 = allClass6To12.length;
    const withResultClass6To12 = allClass6To12.filter((d) => d.correctAnswer != null);
    const resultAddedClass6To12 = withResultClass6To12.length;
    const got75Class6To12 = withResultClass6To12.filter((d) => {
      const m = parseMarks(d.correctAnswer);
      return m != null && m >= GOT75_THRESHOLD_CLASS_6_TO_12;
    });
    const got75CountClass6To12 = got75Class6To12.length;
    const passCountClass6To12 = withResultClass6To12.filter((d) => {
      const m = parseMarks(d.correctAnswer);
      const { passThreshold } = getThresholdsFromConfig(d.instituteClass, config);
      return m != null && m >= passThreshold;
    }).length;
    const got70CountClass6To12 = withResultClass6To12.filter((d) => {
      const m = parseMarks(d.correctAnswer);
      const { got70Threshold } = getThresholdsFromConfig(d.instituteClass, config);
      return m != null && m >= got70Threshold;
    }).length;

    const class6To12 = {
      totalMarks: config.class6To12.totalMarks,
      totalPresent: presentClass6To12,
      resultAddedCount: resultAddedClass6To12,
      resultAddedRatioPercent:
        presentClass6To12 > 0
          ? Math.round((resultAddedClass6To12 / presentClass6To12) * 10000) / 100
          : 0,
      passCount: passCountClass6To12,
      passRatioPercent:
        presentClass6To12 > 0
          ? Math.round((passCountClass6To12 / presentClass6To12) * 10000) / 100
          : 0,
      got70Count: got70CountClass6To12,
      got70RatioPercent:
        presentClass6To12 > 0
          ? Math.round((got70CountClass6To12 / presentClass6To12) * 10000) / 100
          : 0,
      got75Count: got75CountClass6To12,
      got75RatioPercent:
        presentClass6To12 > 0
          ? Math.round((got75CountClass6To12 / presentClass6To12) * 10000) / 100
          : 0,
      byClass: byClass.filter((r) => !CLASS_3_TO_5_SET.has(r.class)),
    };

    const byClassForTop5 = new Map();
    for (const d of withResult) {
      const cls = normalizeClass(d.instituteClass);
      const m = parseMarks(d.correctAnswer);
      if (m == null) continue;
      if (!byClassForTop5.has(cls)) byClassForTop5.set(cls, []);
      byClassForTop5.get(cls).push({
        scholarshipRollNumber: d.scholarshipRollNumber != null ? String(d.scholarshipRollNumber).trim() : null,
        marks: m,
      });
    }
    const top5ByClass = {};
    for (const [cls, list] of byClassForTop5) {
      list.sort((a, b) => b.marks - a.marks);
      top5ByClass[cls] = list.slice(0, 5);
    }

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.status(200).json({
      success: true,
      data: {
        overall: {
          totalApplications,
          totalPresent,
          totalPresentPercentOfApplications,
          resultAddedCount,
          resultAddedRatioPercent: resultAddedRatio,
          passCount,
          passRatioPercent: passRatioOverall,
          passRatioAmongResultAddedPercent: passRatioAmongResult,
          got70Count,
          got70RatioPercent: got70RatioOverall,
          got70RatioAmongResultAddedPercent: got70RatioAmongResult,
        },
        byClass,
        class3To5,
        class6To12,
        top5ByClass,
      },
    });
  } catch (error) {
    console.error("Error getting result stats:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Normalize institute name (case insensitive, remove common suffixes, trim, single space)
const normalizeInstituteName = (instituteName) => {
  if (!instituteName) return "";
  let normalized = String(instituteName).toLowerCase().trim();
  normalized = normalized.replace(/\s+/g, " ");
  const commonWords = [
    "school", "high school", "college", "institute", "academy",
    "madrasah", "madrasha", "madrasa",
    "বিদ্যালয়", "মাদ্রাসা", "কলেজ", "স্কুল", "একাডেমী", "একাডেমি"
  ];
  commonWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    normalized = normalized.replace(regex, "");
  });
  normalized = normalized.replace(/[^\w\s\u0980-\u09FF]/g, "");
  normalized = normalized.replace(/\s+\d+$/, "");
  normalized = normalized.trim().replace(/\s+/g, " ");
  return normalized;
};

// First two words as key (case insensitive); if only one word, use that
const getFirstTwoWordsKey = (normalized) => {
  if (!normalized) return "unknown";
  const words = normalized.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return "unknown";
  return words.slice(0, 2).join(" ");
};

// Levenshtein distance
const levenshteinDistance = (str1, str2) => {
  const len1 = str1.length;
  const len2 = str2.length;
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  const matrix = [];
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[len1][len2];
};

const calculateSimilarity = (str1, str2) => {
  if (str1 === str2) return 1;
  if (!str1.length || !str2.length) return 0;
  const maxLen = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
};

// Classes 3–5 (normalized: 3, Three, three → "3"; 4, Four → "4"; 5, Five → "5")
const CLASS_3_TO_5_SET = new Set(["3", "4", "5"]);
const TOTAL_MARKS_CLASS_3_TO_5 = 45;
const TOTAL_MARKS_OTHERS = 100;

const RESULT_CALCULATION_CONFIG_ID = "default";
const DEFAULT_RESULT_CALCULATION_CONFIG = {
  class3To5: {
    totalMarks: 45,
    passPercent: 40,
    highMarksPercent: 70,
    got75Percent: 75,
  },
  class6To12: {
    totalMarks: 100,
    passPercent: 40,
    highMarksPercent: 60,
    got75Percent: 75,
  },
};

async function getResultCalculationConfig(database) {
  const doc = await database
    .collection("resultCalculationConfig")
    .findOne({ _id: RESULT_CALCULATION_CONFIG_ID });
  if (!doc || !doc.class3To5 || !doc.class6To12) return DEFAULT_RESULT_CALCULATION_CONFIG;
  return {
    class3To5: { ...DEFAULT_RESULT_CALCULATION_CONFIG.class3To5, ...doc.class3To5 },
    class6To12: { ...DEFAULT_RESULT_CALCULATION_CONFIG.class6To12, ...doc.class6To12 },
  };
}

function isClass3To5(instituteClass) {
  const c = normalizeClass(instituteClass);
  return CLASS_3_TO_5_SET.has(c);
}

function getThresholdsFromConfig(instituteClass, config) {
  const c = isClass3To5(instituteClass) ? config.class3To5 : config.class6To12;
  const totalMarks = c.totalMarks;
  const passPercent = typeof c.passPercent === "number" ? c.passPercent : 40;
  const highMarksPercent = typeof c.highMarksPercent === "number" ? c.highMarksPercent : (isClass3To5(instituteClass) ? 70 : 60);
  const got75Percent = typeof c.got75Percent === "number" ? c.got75Percent : 75;
  return {
    totalMarks,
    passThreshold: totalMarks * (passPercent / 100),
    got70Threshold: totalMarks * (highMarksPercent / 100),
    got75Threshold: totalMarks * (got75Percent / 100),
  };
}

function getTotalMarksForClass(instituteClass) {
  return isClass3To5(instituteClass) ? TOTAL_MARKS_CLASS_3_TO_5 : TOTAL_MARKS_OTHERS;
}
function getPassAnd70Thresholds(instituteClass) {
  const totalMarks = getTotalMarksForClass(instituteClass);
  return {
    totalMarks,
    passThreshold: totalMarks * 0.4,
    got70Threshold: totalMarks * 0.7,
  };
}

// Build institute-wise ranked list from a subset of documents (same logic, reused for Class 3–5 and Others)
// totalMarksForCategory, passPercent, highMarksPercent from config (e.g. 45, 40, 70 for class 3–5).
function buildInstituteRankedList(all, totalApplications, totalMarksForCategory, passPercent, highMarksPercent, similarityThreshold) {
  const passThreshold = totalMarksForCategory * (passPercent / 100);
  const highMarksThreshold = totalMarksForCategory * (highMarksPercent / 100);
  const byInstituteMap = new Map();

  for (const d of all) {
    const rawName = d.institute != null ? String(d.institute).trim().replace(/\s+/g, " ") || "Unknown" : "Unknown";
    const normalized = normalizeInstituteName(d.institute);
    const key = getFirstTwoWordsKey(normalized) || "unknown";
    if (!byInstituteMap.has(key)) {
      byInstituteMap.set(key, {
        institute: rawName,
        applicationCount: 0,
        presentCount: 0,
        resultAddedCount: 0,
        passCount: 0,
        got70Count: 0,
        totalMarks: 0,
      });
    }
    const row = byInstituteMap.get(key);
    row.applicationCount += 1;
    if (d.isAttendanceComplete === true) {
      row.presentCount += 1;
      if (d.correctAnswer != null) {
        row.resultAddedCount += 1;
        const m = parseMarks(d.correctAnswer);
        if (m != null) row.totalMarks += m;
        if (m != null && m >= passThreshold) row.passCount += 1;
        if (m != null && m >= highMarksThreshold) row.got70Count += 1;
      }
    }
  }

  const keys = Array.from(byInstituteMap.keys());
  const firstWord = (k) => (k || "").split(/\s+/)[0] || "";
  const firstTwoWords = (k) => (k || "").split(/\s+/).slice(0, 2).join(" ");
  for (let i = 0; i < keys.length; i++) {
    const keyA = keys[i];
    if (!byInstituteMap.has(keyA)) continue;
    const rowA = byInstituteMap.get(keyA);
    for (let j = i + 1; j < keys.length; j++) {
      const keyB = keys[j];
      if (!byInstituteMap.has(keyB)) continue;
      const sim = calculateSimilarity(keyA, keyB);
      const firstWordMatch = firstWord(keyA) === firstWord(keyB) && firstWord(keyA).length >= 2;
      const firstTwoMatch = firstTwoWords(keyA) === firstTwoWords(keyB);
      if (sim >= similarityThreshold || firstTwoMatch || firstWordMatch) {
        const rowB = byInstituteMap.get(keyB);
        rowA.applicationCount += rowB.applicationCount;
        rowA.presentCount += rowB.presentCount;
        rowA.resultAddedCount += rowB.resultAddedCount;
        rowA.passCount += rowB.passCount;
        rowA.got70Count += rowB.got70Count;
        rowA.totalMarks += rowB.totalMarks || 0;
        byInstituteMap.delete(keyB);
      }
    }
  }

  const institutes = Array.from(byInstituteMap.values()).map((row) => {
    const applicationCount = row.applicationCount;
    const presentCount = row.presentCount;
    const resultAddedCount = row.resultAddedCount;
    const passCount = row.passCount;
    const got70Count = row.got70Count;
    const totalMarks = row.totalMarks || 0;
    const presentPercentOfApplications =
      totalApplications > 0 ? Math.round((presentCount / totalApplications) * 10000) / 100 : 0;
    const presentPercentOfOwn =
      applicationCount > 0 ? Math.round((presentCount / applicationCount) * 10000) / 100 : 0;
    const resultAddedRatioPercent =
      presentCount > 0 ? Math.round((resultAddedCount / presentCount) * 10000) / 100 : 0;
    const passRatioPercent =
      presentCount > 0 ? Math.round((passCount / presentCount) * 10000) / 100 : 0;
    const got70RatioPercent =
      presentCount > 0 ? Math.round((got70Count / presentCount) * 10000) / 100 : 0;
    const averageMark = resultAddedCount > 0 ? totalMarks / resultAddedCount : 0;
    const averageMarkPercent =
      resultAddedCount > 0
        ? Math.round((averageMark / totalMarksForCategory) * 10000) / 100
        : 0;
    return {
      institute: row.institute,
      totalMarks: totalMarksForCategory,
      applicationCount,
      totalScholarshipCount: applicationCount,
      presentCount,
      presentPercentOfApplications,
      presentPercentOfOwn,
      resultAddedCount,
      resultAddedRatioPercent,
      passCount,
      passRatioPercent,
      got70Count,
      got70RatioPercent,
      averageMark,
      averageMarkPercent,
    };
  });

  const MIN_PRESENT_FOR_TOP = 10;
  const round2 = (n) => Math.round(n * 100) / 100;
  const collator = new Intl.Collator(["bn", "en"], { sensitivity: "base" });

  const withRankingFields = institutes.map((inst) => {
    const totalStudents = inst.applicationCount;
    const presentCount = inst.presentCount;
    const got70Count = Math.min(inst.got70Count, presentCount);
    const averageMark = inst.averageMark ?? 0;
    let attendanceRate = 0, highScoreRate = 0, avgMarkRate = 0;
    if (totalStudents > 0) {
      attendanceRate = presentCount / totalStudents;
      if (presentCount > 0) highScoreRate = got70Count / presentCount;
      avgMarkRate = Math.min(1, Math.max(0, averageMark / totalMarksForCategory));
    }
    const finalScore = attendanceRate * 0.3 + highScoreRate * 0.5 + avgMarkRate * 0.2;
    return {
      ...inst,
      attendanceRate: round2(attendanceRate),
      highScoreRate: round2(highScoreRate),
      finalScore: round2(finalScore),
    };
  });

  const qualified = withRankingFields.filter((i) => i.presentCount >= MIN_PRESENT_FOR_TOP);
  const notQualified = withRankingFields.filter((i) => i.presentCount < MIN_PRESENT_FOR_TOP);
  const sortByFairRank = (a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (b.highScoreRate !== a.highScoreRate) return b.highScoreRate - a.highScoreRate;
    if (b.attendanceRate !== a.attendanceRate) return b.attendanceRate - a.attendanceRate;
    return collator.compare(a.institute, b.institute);
  };
  qualified.sort(sortByFairRank);
  notQualified.sort(sortByFairRank);
  const sorted = [...qualified, ...notQualified];
  return sorted.map((row, index) => ({
    rank: index + 1,
    totalMarks: totalMarksForCategory,
    ...row,
  }));
}

// Institute-wise stats: two categories — Class 3 to 5, and Others (separate datasets)
const getInstituteWiseStats = async (req, res) => {
  try {
    const database = getDatabase();
    const config = await getResultCalculationConfig(database);
    const collection = database.collection("scholarshipV26");
    const similarityThreshold = 0.7;

    const all = await collection
      .find({})
      .project({
        institute: 1,
        instituteClass: 1,
        isAttendanceComplete: 1,
        correctAnswer: 1,
      })
      .toArray();

    const allClass3To5 = all.filter((d) => isClass3To5(d.instituteClass));
    const allOthers = all.filter((d) => !isClass3To5(d.instituteClass));

    const totalApplicationsClass3To5 = allClass3To5.length;
    const totalApplicationsOthers = allOthers.length;

    const institutesClass3To5 = buildInstituteRankedList(
      allClass3To5,
      totalApplicationsClass3To5,
      config.class3To5.totalMarks,
      config.class3To5.passPercent,
      config.class3To5.highMarksPercent,
      similarityThreshold
    );
    const institutesOthers = buildInstituteRankedList(
      allOthers,
      totalApplicationsOthers,
      config.class6To12.totalMarks,
      config.class6To12.passPercent,
      config.class6To12.highMarksPercent,
      similarityThreshold
    );

    // Prevent 304 Not Modified — always return 200 with fresh data
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    res.status(200).json({
      success: true,
      data: {
        class3To5: {
          totalMarks: config.class3To5.totalMarks,
          totalApplications: totalApplicationsClass3To5,
          totalNumberOfInstitutions: institutesClass3To5.length,
          institutes: institutesClass3To5,
        },
        others: {
          totalMarks: config.class6To12.totalMarks,
          totalApplications: totalApplicationsOthers,
          totalNumberOfInstitutions: institutesOthers.length,
          institutes: institutesOthers,
        },
      },
    });
  } catch (error) {
    console.error("Error getting institute-wise stats:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Insert or update result calculation config (class 3–5 and 6–12: totalMarks, pass%, highMarks%, got75%)
const insertResultCalculationConfig = async (req, res) => {
  try {
    const { class3To5, class6To12 } = req.body;
    const database = getDatabase();
    const coll = database.collection("resultCalculationConfig");

    const doc = {
      _id: RESULT_CALCULATION_CONFIG_ID,
      class3To5: {
        totalMarks: typeof class3To5?.totalMarks === "number" ? class3To5.totalMarks : DEFAULT_RESULT_CALCULATION_CONFIG.class3To5.totalMarks,
        passPercent: typeof class3To5?.passPercent === "number" ? class3To5.passPercent : DEFAULT_RESULT_CALCULATION_CONFIG.class3To5.passPercent,
        highMarksPercent: typeof class3To5?.highMarksPercent === "number" ? class3To5.highMarksPercent : DEFAULT_RESULT_CALCULATION_CONFIG.class3To5.highMarksPercent,
        got75Percent: typeof class3To5?.got75Percent === "number" ? class3To5.got75Percent : DEFAULT_RESULT_CALCULATION_CONFIG.class3To5.got75Percent,
      },
      class6To12: {
        totalMarks: typeof class6To12?.totalMarks === "number" ? class6To12.totalMarks : DEFAULT_RESULT_CALCULATION_CONFIG.class6To12.totalMarks,
        passPercent: typeof class6To12?.passPercent === "number" ? class6To12.passPercent : DEFAULT_RESULT_CALCULATION_CONFIG.class6To12.passPercent,
        highMarksPercent: typeof class6To12?.highMarksPercent === "number" ? class6To12.highMarksPercent : DEFAULT_RESULT_CALCULATION_CONFIG.class6To12.highMarksPercent,
        got75Percent: typeof class6To12?.got75Percent === "number" ? class6To12.got75Percent : DEFAULT_RESULT_CALCULATION_CONFIG.class6To12.got75Percent,
      },
      updatedAt: new Date(),
    };

    await coll.updateOne(
      { _id: RESULT_CALCULATION_CONFIG_ID },
      { $set: doc },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Result calculation config saved",
      data: { class3To5: doc.class3To5, class6To12: doc.class6To12 },
    });
  } catch (error) {
    console.error("Error saving result calculation config:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getResultCalculationConfigApi = async (req, res) => {
  try {
    const database = getDatabase();
    const config = await getResultCalculationConfig(database);
    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error("Error getting result calculation config:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  addResult,
  updateCourseFund,
  deleteResult,
  searchResult,
  getTotalSearches,
  getResultStats,
  getInstituteWiseStats,
  insertResultCalculationConfig,
  getResultCalculationConfigApi,
};
