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
 * Unique: uniqueId — no duplicate vote record id.
 */

const INDEX_VERSION = 2;
let appliedIndexVersion = 0;

async function ensureDmfVotePanelIndexes() {
  if (appliedIndexVersion >= INDEX_VERSION) return;
  const database = getDatabase();
  const coll = database.collection(COLLECTION_NAME);
  await coll.createIndex(
    { ballotNo: 1, voterId: 1 },
    { unique: true, name: "uniq_ballot_voter" }
  );
  await coll.createIndex({ uniqueId: 1 }, { unique: true, name: "uniq_vote_uniqueId" });
  appliedIndexVersion = INDEX_VERSION;
}

module.exports = {
  COLLECTION_NAME,
  ensureDmfVotePanelIndexes,
};
