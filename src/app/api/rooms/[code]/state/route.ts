import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { deserializeGameStateFromFirestore } from "@/lib/game/firestoreState";
import type { GameStateFirestore } from "@/lib/game/firestoreState";
import type { Player, Room } from "@/lib/game/types";

interface Params {
  params: { code: string };
}

export async function GET(_req: Request, { params }: Params) {
  const roomCode = params.code.toUpperCase();
  const db = getAdminDb();
  const roomRef = db.collection("rooms").doc(roomCode);

  const [roomSnap, playersSnap, stateSnap] = await Promise.all([
    roomRef.get(),
    roomRef.collection("players").orderBy("joinOrder", "asc").get(),
    roomRef.collection("state").doc("current").get()
  ]);

  if (!roomSnap.exists) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const room = roomSnap.data() as Room;
  const players = playersSnap.docs.map((d) => d.data() as Player);
  const gameState = stateSnap.exists
    ? deserializeGameStateFromFirestore(stateSnap.data() as GameStateFirestore)
    : null;

  return NextResponse.json({ room, players, gameState });
}

