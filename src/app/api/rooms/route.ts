import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Player, Room } from "@/lib/game/types";
import { deleteStaleRooms } from "@/lib/rooms/cleanup";
import { setPlayerIdCookie } from "@/lib/rooms/cookies";

function generateRoomCode(): string {
  // Simple 4-letter code.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function POST(req: Request) {
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

  try {
    await deleteStaleRooms(db);
  } catch (err) {
    console.error("Stale room cleanup failed:", err);
  }

  // Ensure we do not collide on existing room codes.
  let code = generateRoomCode();
  // Basic retry loop.
  for (let i = 0; i < 5; i += 1) {
    const doc = await db.collection("rooms").doc(code).get();
    if (!doc.exists) break;
    code = generateRoomCode();
  }

  const now = Date.now();

  const playerId = randomUUID();
  const room: Room = {
    code,
    status: "lobby",
    createdAt: now,
    updatedAt: now,
    hostPlayerId: playerId
  };

  const player: Player = {
    id: playerId,
    nickname: nickname.trim(),
    isHost: true,
    joinOrder: 0
  };

  const roomRef = db.collection("rooms").doc(code);

  await db.runTransaction(async (tx) => {
    tx.set(roomRef, room);
    tx.set(roomRef.collection("players").doc(playerId), player);
  });

  setPlayerIdCookie(code, playerId);

  return NextResponse.json({ code, playerId, isHost: true });
}

