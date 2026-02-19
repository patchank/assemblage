import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Player, Room } from "@/lib/game/types";
import { getPlayerIdFromCookies, setPlayerIdCookie } from "@/lib/rooms/cookies";

interface Params {
  params: { code: string };
}

export async function POST(req: Request, { params }: Params) {
  const { code } = params;
  const roomCode = code.toUpperCase();

  const { nickname } = (await req.json().catch(() => ({}))) as {
    nickname?: string;
  };

  if (!nickname || typeof nickname !== "string" || nickname.trim() === "") {
    return NextResponse.json(
      { error: "Nickname is required." },
      { status: 400 }
    );
  }

  const db = getAdminDb();
  const roomRef = db.collection("rooms").doc(roomCode);
  const roomSnap = await roomRef.get();

  if (!roomSnap.exists) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const room = roomSnap.data() as Room;

  if (room.status !== "lobby") {
    return NextResponse.json(
      { error: "Game has already started." },
      { status: 400 }
    );
  }

  const playersSnap = await roomRef.collection("players").get();
  const players = playersSnap.docs.map((d) => d.data() as Player);

  if (players.length >= 4) {
    return NextResponse.json(
      { error: "Room is full (maximum 4 players)." },
      { status: 400 }
    );
  }

  // If this browser already has a player cookie for the room, reuse it.
  const existingPlayerId = getPlayerIdFromCookies(roomCode);
  const existingPlayer = existingPlayerId
    ? players.find((p) => p.id === existingPlayerId)
    : undefined;

  let playerId: string;
  if (existingPlayer) {
    playerId = existingPlayer.id;
  } else {
    playerId = randomUUID();
  }

  const player: Player = {
    id: playerId,
    nickname: nickname.trim(),
    isHost: room.hostPlayerId === playerId,
    joinOrder: existingPlayer ? existingPlayer.joinOrder : players.length
  };

  const now = Date.now();
  await roomRef.update({ updatedAt: now });
  await roomRef.collection("players").doc(playerId).set(player, { merge: true });

  setPlayerIdCookie(roomCode, playerId);

  return NextResponse.json({ code: roomCode, playerId, isHost: player.isHost });
}

