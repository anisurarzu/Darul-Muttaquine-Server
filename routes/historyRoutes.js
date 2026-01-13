const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const upload = require("../utils/upload");
const {
  uploadFile,
  insertHistoryInfo,
  getAllFiles,
  deleteFile,
  getHistoryInfo,
  deleteHistoryInfo,
} = require("../controllers/historyController");

router.post("/upload", verifyAuthToken, upload.single("file"), uploadFile);
router.post("/history-info", verifyAuthToken, insertHistoryInfo);
router.get("/upload", verifyAuthToken, getAllFiles);
router.delete("/upload/:id", verifyAuthToken, deleteFile);
router.get("/historyInfo", getHistoryInfo);
router.delete("/history-info/:id", verifyAuthToken, deleteHistoryInfo);

module.exports = router;
