const { ObjectId } = require("mongodb");
const { getDatabase } = require("../config/database");

// Add result (Scholarship Roll No + Correct Answer only)
const addResult = async (req, res) => {
  try {
    const { scholarshipRollNumber, correctAnswer } = req.body;

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

    const result = await database.collection("scholarshipV26").updateOne(
      { scholarshipRollNumber },
      {
        $set: {
          userId: ObjectId(userId),
          correctAnswer,
          resultUpdatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    res.status(200).json({
      success: true,
      message: "Result added successfully",
      data: {
        scholarshipRollNumber,
        correctAnswer,
      },
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
// Pass = correctAnswer >= 40 (%), 70% ratio = correctAnswer >= 70
const getResultStats = async (req, res) => {
  try {
    const database = getDatabase();
    const collection = database.collection("scholarshipV26");

    const passThreshold = 40; // 40% to pass
    const highMarksThreshold = 70; // 70% for "got 70% marks" ratio

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
      return m != null && m >= highMarksThreshold;
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
        });
      }
      const row = byClassMap.get(cls);
      row.totalPresent += 1;
      if (d.correctAnswer != null) {
        row.resultAddedCount += 1;
        const m = parseMarks(d.correctAnswer);
        if (m != null && m >= passThreshold) row.passCount += 1;
        if (m != null && m >= highMarksThreshold) row.got70Count += 1;
      }
    }

    const byClass = Array.from(byClassMap.values()).map((row) => {
      const totalPresent = row.totalPresent;
      const resultAddedCount = row.resultAddedCount;
      const passCount = row.passCount;
      const got70Count = row.got70Count;
      return {
        class: row.class,
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
    });

    byClass.sort((a, b) => {
      const na = Number(a.class);
      const nb = Number(b.class);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return String(a.class).localeCompare(String(b.class));
    });

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

function isClass3To5(instituteClass) {
  const c = normalizeClass(instituteClass);
  return CLASS_3_TO_5_SET.has(c);
}

// Build institute-wise ranked list from a subset of documents (same logic, reused for Class 3–5 and Others)
function buildInstituteRankedList(all, totalApplications, passThreshold, highMarksThreshold, similarityThreshold) {
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
    return {
      institute: row.institute,
      applicationCount,
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
      avgMarkRate = Math.min(1, Math.max(0, averageMark / 100));
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
  return sorted.map((row, index) => ({ rank: index + 1, ...row }));
}

// Institute-wise stats: two categories — Class 3 to 5, and Others (separate datasets)
const getInstituteWiseStats = async (req, res) => {
  try {
    const database = getDatabase();
    const collection = database.collection("scholarshipV26");
    const passThreshold = 40;
    const highMarksThreshold = 70;
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
      passThreshold,
      highMarksThreshold,
      similarityThreshold
    );
    const institutesOthers = buildInstituteRankedList(
      allOthers,
      totalApplicationsOthers,
      passThreshold,
      highMarksThreshold,
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
          totalApplications: totalApplicationsClass3To5,
          totalNumberOfInstitutions: institutesClass3To5.length,
          institutes: institutesClass3To5,
        },
        others: {
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

module.exports = {
  addResult,
  updateCourseFund,
  deleteResult,
  searchResult,
  getTotalSearches,
  getResultStats,
  getInstituteWiseStats,
};
