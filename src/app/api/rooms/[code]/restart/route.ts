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
      { error: "Only the host can start a new game." },
      { status: 403 }
    );
  }

  const stateRef = roomRef.collection("state").doc("current");
  const stateSnap = await stateRef.get();
  if (!stateSnap.exists) {
    return NextResponse.json(
      { error: "No game state." },
      { status: 400 }
    );
  }

  const currentPhase = (stateSnap.data() as { phase?: string })?.phase;
  if (currentPhase !== "finished") {
    return NextResponse.json(
      { error: "Can only start a new game when the current game is finished." },
      { status: 400 }
    );
  }

  const playersSnap = await roomRef
    .collection("players")
    .orderBy("joinOrder", "asc")
    .get();
  const players = playersSnap.docs.map((d) => d.data() as Player);

  if (players.length < 2 || players.length > 4) {
    return NextResponse.json(
      { error: "Need 2–4 players to start a new game." },
      { status: 400 }
    );
  }

  const gameState = createInitialState(roomCode, players);
  const stateForFirestore = serializeGameStateForFirestore(gameState);

  await stateRef.set(stateForFirestore);
  await roomRef.update({ updatedAt: Date.now() });

  return NextResponse.json({ ok: true });
}
