import type { Firestore, WriteBatch } from "firebase-admin/firestore";

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const BATCH_SIZE = 500;

/**
 * Delete a room document and its subcollections (players, state).
 * Firestore does not cascade-delete subcollections.
 */
async function deleteRoomAndSubcollections(
  db: Firestore,
  roomId: string
): Promise<void> {
  const roomRef = db.collection("rooms").doc(roomId);

  const playersSnap = await roomRef.collection("players").get();
  const stateSnap = await roomRef.collection("state").get();

  const batches: { batch: WriteBatch; count: number }[] = [];
  let current = { batch: db.batch(), count: 0 };

  function flush() {
    if (current.count > 0) {
      batches.push(current);
      current = { batch: db.batch(), count: 0 };
    }
  }

  for (const d of playersSnap.docs) {
    current.batch.delete(d.ref);
    current.count += 1;
    if (current.count >= BATCH_SIZE) flush();
  }
  for (const d of stateSnap.docs) {
    current.batch.delete(d.ref);
    current.count += 1;
    if (current.count >= BATCH_SIZE) flush();
  }
  current.batch.delete(roomRef);
  current.count += 1;
  flush();
  if (current.count > 0) batches.push(current);

  for (const { batch } of batches) {
    await batch.commit();
  }
}

/**
 * Delete all rooms that have not been updated in more than 2 hours.
 * Call this when creating a new room to avoid accumulation of stale data.
 */
export async function deleteStaleRooms(db: Firestore): Promise<void> {
  const cutoff = Date.now() - STALE_THRESHOLD_MS;
  const snapshot = await db
    .collection("rooms")
    .where("updatedAt", "<", cutoff)
    .get();

  for (const doc of snapshot.docs) {
    try {
      await deleteRoomAndSubcollections(db, doc.id);
    } catch (err) {
      console.error(`Failed to delete stale room ${doc.id}:`, err);
    }
  }
}
