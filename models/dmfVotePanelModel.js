const { getDatabase } = require("../config/database");

const COLLECTION_NAME = "dmfVotePanelVotes";

/**
 * Each vote row:
 * {
 *   uniqueId: string,           // from client (vote / transaction id)
 *   candidateUniqueId: string, // from client
 *   ballotNo: string,
 *   voterId: string,
 *   createdAt: Date             // server-set
 * }
 * Unique: (ballotNo + voterId) — same voter once per ballot.
 * uniqueId is stored but not globally unique (client may repeat); do not index unique.
 */

const INDEX_VERSION = 5;
let appliedIndexVersion = 0;

/** Keep newest row per (ballotNo, voterId); delete older duplicates so unique index can build. */
async function removeDuplicateBallotVoterPairs(coll) {
  const groups = await coll
    .aggregate([
      {
        $group: {
          _id: { ballotNo: "$ballotNo", voterId: "$voterId" },
          ids: { $push: "$_id" },
          n: { $sum: 1 },
        },
      },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();

  for (const g of groups) {
    const docs = await coll
      .find({ _id: { $in: g.ids } })
      .sort({ createdAt: -1, _id: -1 })
      .toArray();
    if (docs.length <= 1) continue;
    const deleteIds = docs.slice(1).map((d) => d._id);
    await coll.deleteMany({ _id: { $in: deleteIds } });
  }
}

async function tryDropIndex(coll, name) {
  try {
    await coll.dropIndex(name);
  } catch (e) {
    const ok =
      e?.code === 27 ||
      e?.codeName === "IndexNotFound" ||
      (typeof e?.message === "string" && e.message.toLowerCase().includes("index not found"));
    if (!ok) throw e;
  }
}

async function ensureDmfVotePanelIndexes() {
  if (appliedIndexVersion >= INDEX_VERSION) return;
  const database = getDatabase();
  const coll = database.collection(COLLECTION_NAME);

  const createBallotVoterUnique = async () => {
    await coll.createIndex(
      { ballotNo: 1, voterId: 1 },
      { unique: true, name: "uniq_ballot_voter" }
    );
  };

  await removeDuplicateBallotVoterPairs(coll);
  await tryDropIndex(coll, "uniq_vote_uniqueId");

  try {
    await createBallotVoterUnique();
  } catch (e) {
    if (e?.code !== 11000) throw e;
    await removeDuplicateBallotVoterPairs(coll);
    await tryDropIndex(coll, "uniq_ballot_voter");
    await tryDropIndex(coll, "uniq_vote_uniqueId");
    await createBallotVoterUnique();
  }

  appliedIndexVersion = INDEX_VERSION;
}

module.exports = {
  COLLECTION_NAME,
  ensureDmfVotePanelIndexes,
};
