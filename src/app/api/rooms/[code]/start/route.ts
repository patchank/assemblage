import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { createInitialState } from "@/lib/game/engine";
import { serializeGameStateForFirestore } from "@/lib/game/firestoreState";
import type { Player, Room } from "@/lib/game/types";
import { getPlayerIdFromCookies } from "@/lib/rooms/cookies";

interface Params {
  params: { code: string };
}

export async function POST(_req: Request, { params }: Params) {
  const roomCode = params.code.toUpperCase();
  const db = getAdminDb();
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();

  if (!roomSnap.exists) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const room = roomSnap.data() as Room;

  const playerId = getPlayerIdFromCookies(roomCode);
  if (!playerId) {
    return NextResponse.json(
      { error: "Missing player identity." },
      { status: 401 }
    );
  }

  if (room.hostPlayerId !== playerId) {
    return NextResponse.json(
      { error: "Only the host can start the game." },
      { status: 403 }
    );
  }

  if (room.status !== "lobby") {
    return NextResponse.json(
      { error: "Game has already started." },
      { status: 400 }
    );
  }

  const playersSnap = await roomRef
    .collection("players")
    .orderBy("joinOrder", "asc")
    .get();
  const players = playersSnap.docs.map((d) => d.data() as Player);

  if (players.length < 2) {
    return NextResponse.json(
      { error: "At least 2 players are required to start." },
      { status: 400 }
    );
  }

  if (players.length > 4) {
    return NextResponse.json(
      { error: "Maximum 4 players allowed." },
      { status: 400 }
    );
  }

  const gameState = createInitialState(roomCode, players);
  const stateForFirestore = serializeGameStateForFirestore(gameState);

  await db.runTransaction(async (tx) => {
    tx.update(roomRef, {
      status: "in_progress",
      updatedAt: Date.now()
    });
    tx.set(roomRef.collection("state").doc("current"), stateForFirestore);
  });

  return NextResponse.json({ ok: true });
}

