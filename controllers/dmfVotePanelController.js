const { getDatabase } = require("../config/database");
const {
  COLLECTION_NAME,
  ensureDmfVotePanelIndexes,
} = require("../models/dmfVotePanelModel");

const toStr = (v) => (v != null ? String(v).trim() : "");

/**
 * POST body: { ballotNo, voterId, uniqueId, candidateUniqueId }
 * Stores: { ballotNo, voterId, uniqueId, candidateUniqueId, createdAt } — createdAt set by server only.
 * Rejects duplicate (ballotNo + voterId) or duplicate uniqueId.
 */
const addVoteDetail = async (req, res) => {
  try {
    await ensureDmfVotePanelIndexes();

    const ballotNo = toStr(req.body?.ballotNo);
    const voterId = toStr(req.body?.voterId);
    const uniqueId = toStr(req.body?.uniqueId);
    const candidateUniqueId = toStr(
      req.body?.candidateUniqueId ?? req.body?.candidateUniqueid
    );

    if (!ballotNo || !voterId || !uniqueId || !candidateUniqueId) {
      return res.status(400).json({
        success: false,
        message:
          "ballotNo, voterId, uniqueId, and candidateUniqueId are required",
      });
    }

    const database = getDatabase();
    const coll = database.collection(COLLECTION_NAME);

    const createdAt = new Date();

    const doc = {
      ballotNo,
      voterId,
      uniqueId,
      candidateUniqueId,
      createdAt,
    };

    try {
      await coll.insertOne(doc);
    } catch (err) {
      if (err.code === 11000) {
        const key = err.keyPattern ? Object.keys(err.keyPattern).join("+") : "";
        let message =
          "Duplicate not allowed: same ballotNo+voterId, or duplicate uniqueId.";
        if (key.includes("ballotNo") && key.includes("voterId")) {
          message =
            "This voter has already voted for this ballot (duplicate ballotNo + voterId).";
        } else if (key.includes("uniqueId")) {
          message = "This uniqueId has already been used.";
        }
        return res.status(409).json({
          success: false,
          message,
        });
      }
      throw err;
    }

    return res.status(201).json({
      success: true,
      message: "Vote recorded",
      data: {
        ballotDetails: doc,
      },
    });
  } catch (error) {
    console.error("dmfVotePanel addVoteDetail:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** GET all vote rows (same shape as voteDetails list) */
const getVoteDetails = async (req, res) => {
  try {
    await ensureDmfVotePanelIndexes();
    const database = getDatabase();
    const coll = database.collection(COLLECTION_NAME);

    const ballotNo = toStr(req.query?.ballotNo);
    const filter = ballotNo ? { ballotNo } : {};

    const rows = await coll
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const voteDetails = rows.map((r) => ({
      ballotDetails: {
        ballotNo: r.ballotNo,
        uniqueId: r.uniqueId,
        voterId: r.voterId,
        candidateUniqueId: r.candidateUniqueId,
        createdAt: r.createdAt,
      },
    }));

    return res.status(200).json({
      success: true,
      data: { voteDetails },
    });
  } catch (error) {
    console.error("dmfVotePanel getVoteDetails:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  addVoteDetail,
  getVoteDetails,
};
