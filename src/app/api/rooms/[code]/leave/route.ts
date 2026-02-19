import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  deserializeGameStateFromFirestore,
  serializeGameStateForFirestore
} from "@/lib/game/firestoreState";
import type { GameStateFirestore } from "@/lib/game/firestoreState";
import type { Room } from "@/lib/game/types";
import { getPlayerIdFromCookies } from "@/lib/rooms/cookies";

interface Params {
  params: { code: string };
}

export async function POST(_req: Request, { params }: Params) {
  const roomCode = params.code.toUpperCase();
  const db = getAdminDb();
  const roomRef = db.collection("rooms").doc(roomCode);
  const stateRef = roomRef.collection("state").doc("current");

  const playerId = getPlayerIdFromCookies(roomCode);
  if (!playerId) {
    return NextResponse.json(
      { error: "Missing player identity." },
      { status: 401 }
    );
  }

  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const room = roomSnap.data() as Room;
  if (room.status !== "in_progress") {
    return NextResponse.json(
      { error: "No game in progress." },
      { status: 400 }
    );
  }

  const stateSnap = await stateRef.get();
  if (!stateSnap.exists) {
    return NextResponse.json(
      { error: "Game state not found." },
      { status: 400 }
    );
  }

  const state = deserializeGameStateFromFirestore(
    stateSnap.data() as GameStateFirestore
  );

  if (state.phase !== "playing") {
    return NextResponse.json(
      { error: "Game is not in playing phase." },
      { status: 400 }
    );
  }

  const finishedState = {
    ...state,
    phase: "finished" as const,
    scores: state.scores ?? {},
    winnerPlayerId: undefined
  };

  await stateRef.set(serializeGameStateForFirestore(finishedState));
  await roomRef.update({
    status: "finished",
    updatedAt: Date.now()
  });

  return NextResponse.json({ ok: true });
}
