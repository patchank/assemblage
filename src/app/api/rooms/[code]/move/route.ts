import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { applyMove } from "@/lib/game/engine";
import {
  deserializeGameStateFromFirestore,
  serializeGameStateForFirestore
} from "@/lib/game/firestoreState";
import type { GameStateFirestore } from "@/lib/game/firestoreState";
import type { PlaceCardMove, TakeCardMove } from "@/lib/game/types";
import { getPlayerIdFromCookies } from "@/lib/rooms/cookies";

interface Params {
  params: { code: string };
}

type MovePayload =
  | { type: "take"; rowIndex: number; side: "left" | "right" }
  | {
      type: "place";
      rotation: 0 | 90 | 180 | 270;
      row: number;
      col: number;
      newEnsemble?: boolean;
      ensembleIndex?: number;
    };

export async function POST(req: Request, { params }: Params) {
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

  const body = (await req.json().catch(() => ({}))) as MovePayload;
  if (body.type !== "take" && body.type !== "place") {
    return NextResponse.json(
      { error: "Invalid move payload: type must be 'take' or 'place'." },
      { status: 400 }
    );
  }

  let move: TakeCardMove | PlaceCardMove;
  if (body.type === "take") {
    if (
      typeof body.rowIndex !== "number" ||
      (body.side !== "left" && body.side !== "right")
    ) {
      return NextResponse.json(
        { error: "Invalid take move: rowIndex and side required." },
        { status: 400 }
      );
    }
    move = { type: "take", rowIndex: body.rowIndex, side: body.side };
  } else {
    const rot = body.rotation;
    if (
      typeof body.row !== "number" ||
      typeof body.col !== "number" ||
      (rot !== 0 && rot !== 90 && rot !== 180 && rot !== 270)
    ) {
      return NextResponse.json(
        { error: "Invalid place move: rotation (0|90|180|270), row, col required." },
        { status: 400 }
      );
    }
    move = {
      type: "place",
      rotation: rot,
      row: body.row,
      col: body.col,
      ...(body.newEnsemble === true && { newEnsemble: true }),
      ...(typeof body.ensembleIndex === "number" && { ensembleIndex: body.ensembleIndex })
    };
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

  let nextState;
  try {
    nextState = applyMove(state, move, playerId);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }

  await stateRef.set(serializeGameStateForFirestore(nextState));
  await roomRef.update({ updatedAt: Date.now() });

  return NextResponse.json({ ok: true });
}
