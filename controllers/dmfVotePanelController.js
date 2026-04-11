const { getDatabase } = require("../config/database");
const {
  COLLECTION_NAME,
  ensureDmfVotePanelIndexes,
} = require("../models/dmfVotePanelModel");

const toStr = (v) => (v != null ? String(v).trim() : "");

/** Same ballot label always stored the same way (e.g. "1" and "01" → "01" for numeric ballots). */
function normalizeBallotNo(v) {
  const s = toStr(v);
  if (!s) return "";
  if (/^\d+$/.test(s)) return s.padStart(2, "0");
  return s;
}

/** Voter id: trim only (must match exactly for uniqueness). */
function normalizeVoterId(v) {
  return toStr(v);
}

/** Values that might represent the same numeric ballot in old data ("1" vs "01"). */
function ballotNoQueryValues(normalizedBallotNo) {
  const b = normalizedBallotNo;
  if (!b) return [];
  const set = new Set([b]);
  if (/^\d+$/.test(b)) {
    set.add(String(parseInt(b, 10)));
    set.add(b.padStart(2, "0"));
  }
  return [...set];
}

/**
 * POST body: { ballotNo, voterId, uniqueId, candidateUniqueId }
 * Stores: { ballotNo, voterId, uniqueId, candidateUniqueId, createdAt } — createdAt set by server only.
 * Duplicate rule: same voterId + same ballotNo only (not uniqueId).
 */
const addVoteDetail = async (req, res) => {
  try {
    await ensureDmfVotePanelIndexes();

    const ballotNo = normalizeBallotNo(req.body?.ballotNo);
    const voterId = normalizeVoterId(req.body?.voterId);
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

    // একই ballotNo + একই voterId আগে থাকলে আর ভোট নয় (ডাটাসেটে আগের রেকর্ড চেক)
    const ballotKeys = ballotNoQueryValues(ballotNo);
    const alreadyVoted = await coll.findOne({
      voterId,
      ballotNo: ballotKeys.length ? { $in: ballotKeys } : ballotNo,
    });
    if (alreadyVoted) {
      return res.status(409).json({
        success: false,
        message:
          "এই ballotNo তে এই voterId দিয়ে আগেই ভোট আছে। আবার ভোট দেওয়া যাবে না।",
        code: "DUPLICATE_BALLOT_VOTER",
      });
    }

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
        return res.status(409).json({
          success: false,
          message:
            "এই ballotNo তে এই voterId দিয়ে আগেই ভোট আছে। আবার ভোট দেওয়া যাবে না।",
          code: "DUPLICATE_BALLOT_VOTER",
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

/** GET সব ভোট রেকর্ড — কোনো ফিল্টার নেই */
const getVoteDetails = async (req, res) => {
  try {
    await ensureDmfVotePanelIndexes();
    const database = getDatabase();
    const coll = database.collection(COLLECTION_NAME);

    const rows = await coll.find({}).sort({ createdAt: -1 }).toArray();

    const voteDetails = rows.map((r) => ({
      ballotDetails: {
        id: r._id,
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
