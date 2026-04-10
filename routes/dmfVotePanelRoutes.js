const express = require("express");
const router = express.Router();
const { verifyAuthToken } = require("../middleware/auth");
const {
  addVoteDetail,
  getVoteDetails,
} = require("../controllers/dmfVotePanelController");

router.post("/dmf-vote-panel/vote", addVoteDetail);
router.get("/dmf-vote-panel/votes", getVoteDetails);

module.exports = router;
