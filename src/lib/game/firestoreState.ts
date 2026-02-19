import type { GameState, GridCard, PlayerBoard, PendingCard } from "./types";

/**
 * Firestore: no nested arrays (grid -> gridRows), no undefined (optional fields omitted).
 */
export interface GameStateFirestore {
  roomCode: string;
  phase: GameState["phase"];
  gridRows: Record<string, (GridCard | null)[]>;
  turnOrder: string[];
  currentTurnIndex: number;
  boards: PlayerBoard[];
  pendingCard?: PendingCard | null;
  scores?: Record<string, number>;
  winnerPlayerId?: string;
}

export function serializeGameStateForFirestore(
  state: GameState
): GameStateFirestore {
  const gridRows: Record<string, (GridCard | null)[]> = {};
  state.grid.forEach((row, i) => {
    gridRows[String(i)] = row;
  });
  const doc: GameStateFirestore = {
    roomCode: state.roomCode,
    phase: state.phase,
    gridRows,
    turnOrder: state.turnOrder,
    currentTurnIndex: state.currentTurnIndex,
    boards: state.boards
  };
  if (state.pendingCard !== undefined && state.pendingCard !== null) {
    doc.pendingCard = state.pendingCard;
  }
  if (state.scores !== undefined) doc.scores = state.scores;
  if (state.winnerPlayerId !== undefined) doc.winnerPlayerId = state.winnerPlayerId;
  return doc;
}

/** Legacy shape: board had placedCards instead of ensembles. */
function migrateBoard(raw: { playerId: string; placedCards?: unknown[]; ensembles?: unknown[] }): PlayerBoard {
  if (raw.ensembles && Array.isArray(raw.ensembles) && raw.ensembles.length > 0) {
    return { playerId: raw.playerId, ensembles: raw.ensembles as PlayerBoard["ensembles"] };
  }
  if (raw.placedCards && Array.isArray(raw.placedCards)) {
    return {
      playerId: raw.playerId,
      ensembles: [{ id: "legacy", placedCards: raw.placedCards as PlayerBoard["ensembles"][0]["placedCards"] }]
    };
  }
  return { playerId: raw.playerId, ensembles: [] };
}

export function deserializeGameStateFromFirestore(
  doc: GameStateFirestore
): GameState {
  const grid: (GridCard | null)[][] = [];
  const rowIndices = Object.keys(doc.gridRows).sort((a, b) => Number(a) - Number(b));
  for (const key of rowIndices) {
    grid.push(doc.gridRows[key]);
  }
  const rawBoards = doc.boards ?? [];
  const boards = rawBoards.map((b) => migrateBoard(b as Parameters<typeof migrateBoard>[0]));
  return {
    roomCode: doc.roomCode,
    phase: doc.phase,
    grid,
    turnOrder: doc.turnOrder,
    currentTurnIndex: doc.currentTurnIndex,
    boards,
    pendingCard: doc.pendingCard ?? null,
    scores: doc.scores,
    winnerPlayerId: doc.winnerPlayerId
  };
}
