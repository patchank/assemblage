import { randomUUID } from "crypto";
import {
  CARD_DEFINITIONS,
  getPointsForCardCode,
  TOTAL_CARD_COUNT
} from "./cardCatalog";
import { getConnectionCounts, type Rotation } from "./connectionPoints";
import type {
  CardInstance,
  EnsembleBoard,
  GameState,
  GridCard,
  PlacedCard,
  Player,
  PlayerBoard
} from "./types";
import type { PlaceCardMove, TakeCardMove } from "./types";

const ROWS = 4;
const COLS = 12;

const NEIGHBOR_OFFSETS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

function buildDeck(): CardInstance[] {
  if (TOTAL_CARD_COUNT !== ROWS * COLS) {
    throw new Error(
      `Card catalog must contain exactly ${ROWS * COLS} cards, got ${TOTAL_CARD_COUNT}`
    );
  }

  const instances: CardInstance[] = [];
  for (const def of CARD_DEFINITIONS) {
    for (let i = 0; i < def.count; i += 1) {
      instances.push({
        id: randomUUID(),
        code: def.code,
        category: def.category,
        imageSrc: def.imageSrc,
        points: def.points
      });
    }
  }

  for (let i = instances.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [instances[i], instances[j]] = [instances[j], instances[i]];
  }

  return instances;
}

export function createInitialState(
  roomCode: string,
  players: Player[]
): GameState {
  if (players.length < 2 || players.length > 4) {
    throw new Error("Assemblage requires between 2 and 4 players.");
  }

  const deck = buildDeck();
  const grid: (GridCard | null)[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );

  let index = 0;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const card = deck[index];
      grid[row][col] = { ...card, row, col };
      index += 1;
    }
  }

  const boards: PlayerBoard[] = players.map((p) => ({
    playerId: p.id,
    ensembles: []
  }));

  const turnOrder = [...players]
    .sort((a, b) => a.joinOrder - b.joinOrder)
    .map((p) => p.id);

  const currentTurnIndex = Math.floor(Math.random() * turnOrder.length);

  return {
    roomCode,
    phase: "playing",
    grid,
    turnOrder,
    currentTurnIndex,
    boards,
    pendingCard: null
  };
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function getBoardCellMap(placedCards: PlacedCard[]): Map<string, PlacedCard> {
  const map = new Map<string, PlacedCard>();
  for (const pc of placedCards) {
    map.set(cellKey(pc.row, pc.col), pc);
  }
  return map;
}

/**
 * Get connection count on the side of the placed card that faces (targetRow, targetCol).
 */
function getSideFacing(
  placed: PlacedCard,
  targetRow: number,
  targetCol: number
): number {
  const counts = getConnectionCounts(placed.card.code, placed.rotation);
  const dr = targetRow - placed.row;
  const dc = targetCol - placed.col;
  if (dr === -1 && dc === 0) return counts.top;
  if (dr === 1 && dc === 0) return counts.bottom;
  if (dr === 0 && dc === -1) return counts.left;
  if (dr === 0 && dc === 1) return counts.right;
  return 0;
}

/**
 * Validate placement on an ensemble: (row, col) empty; if the ensemble already has cards,
 * the new card must be adjacent to at least one of them; every adjacent placed card
 * must have matching dot count on the touching side. 0-0 is allowed only if the new
 * card also has at least one adjacent card where both touching sides have > 0 dots.
 */
function canPlaceOnEnsemble(
  placedCards: PlacedCard[],
  cardCode: string,
  rotation: Rotation,
  row: number,
  col: number
): boolean {
  const cellMap = getBoardCellMap(placedCards);
  if (cellMap.has(cellKey(row, col))) return false;

  if (placedCards.length > 0) {
    let hasAdjacent = false;
    for (const [dr, dc] of NEIGHBOR_OFFSETS) {
      if (cellMap.has(cellKey(row + dr, col + dc))) {
        hasAdjacent = true;
        break;
      }
    }
    if (!hasAdjacent) return false;
  }

  const newCounts = getConnectionCounts(cardCode, rotation);
  let hasNonZeroConnection = false;
  for (const [dr, dc] of NEIGHBOR_OFFSETS) {
    const nr = row + dr;
    const nc = col + dc;
    const neighbor = cellMap.get(cellKey(nr, nc));
    if (!neighbor) continue;
    const ourSide =
      dr === -1 ? newCounts.top : dr === 1 ? newCounts.bottom : dc === -1 ? newCounts.left : newCounts.right;
    const theirSide = getSideFacing(neighbor, row, col);
    if (ourSide !== theirSide) return false;
    if (ourSide > 0) hasNonZeroConnection = true;
  }
  return placedCards.length === 0 || hasNonZeroConnection;
}

/**
 * Connected components (ensembles) on a board. Each ensemble is PlacedCard[].
 */
function getEnsembles(placedCards: PlacedCard[]): PlacedCard[][] {
  if (placedCards.length === 0) return [];
  const cellMap = getBoardCellMap(placedCards);
  const visited = new Set<string>();
  const result: PlacedCard[][] = [];

  function dfs(pc: PlacedCard, component: PlacedCard[]): void {
    const key = cellKey(pc.row, pc.col);
    if (visited.has(key)) return;
    visited.add(key);
    component.push(pc);
    for (const [dr, dc] of NEIGHBOR_OFFSETS) {
      const neighbor = cellMap.get(cellKey(pc.row + dr, pc.col + dc));
      if (neighbor) dfs(neighbor, component);
    }
  }

  for (const pc of placedCards) {
    if (visited.has(cellKey(pc.row, pc.col))) continue;
    const component: PlacedCard[] = [];
    dfs(pc, component);
    result.push(component);
  }
  return result;
}

/**
 * Ensemble is complete iff every card's dotted side is connected to another card with same count.
 */
function isCompleteEnsemble(ensemble: PlacedCard[]): boolean {
  const cellMap = getBoardCellMap(ensemble);
  for (const pc of ensemble) {
    const counts = getConnectionCounts(pc.card.code, pc.rotation);
    const sides = [
      ["top", -1, 0] as const,
      ["bottom", 1, 0] as const,
      ["left", 0, -1] as const,
      ["right", 0, 1] as const
    ];
    for (const [side, dr, dc] of sides) {
      const count = counts[side];
      if (count === 0) continue;
      const neighbor = cellMap.get(cellKey(pc.row + dr, pc.col + dc));
      if (!neighbor) return false;
      const theirSide = getSideFacing(neighbor, pc.row, pc.col);
      if (theirSide !== count) return false;
    }
  }
  return true;
}

function computeScores(boards: PlayerBoard[]): Record<string, number> {
  const scores: Record<string, number> = {};
  let maxCompleteSize = 0;
  const playersWithMaxComplete: string[] = [];

  for (const board of boards) {
    let total = 0;
    let playerMaxComplete = 0;
    for (const ensembleBoard of board.ensembles) {
      const ensemble = ensembleBoard.placedCards;
      if (ensemble.length === 0) continue;
      const complete = isCompleteEnsemble(ensemble);
      const points = ensemble.reduce((s, pc) => s + getPointsForCardCode(pc.card.code), 0);
      if (complete) {
        total += points;
        if (ensemble.length > playerMaxComplete) playerMaxComplete = ensemble.length;
      } else {
        total -= points;
      }
    }
    scores[board.playerId] = total;
    if (playerMaxComplete > maxCompleteSize) {
      maxCompleteSize = playerMaxComplete;
      playersWithMaxComplete.length = 0;
      playersWithMaxComplete.push(board.playerId);
    } else if (playerMaxComplete === maxCompleteSize && playerMaxComplete > 0) {
      playersWithMaxComplete.push(board.playerId);
    }
  }

  const bonus = 50;
  const share = playersWithMaxComplete.length > 0 ? Math.floor(bonus / playersWithMaxComplete.length) : 0;
  for (const pid of playersWithMaxComplete) {
    scores[pid] = (scores[pid] ?? 0) + share;
  }
  return scores;
}

export function applyMove(
  state: GameState,
  move: TakeCardMove | PlaceCardMove,
  playerId: string
): GameState {
  if (state.phase !== "playing") {
    throw new Error("Game is not in playing phase.");
  }

  const expectedPlayerId = state.turnOrder[state.currentTurnIndex];
  if (playerId !== expectedPlayerId) {
    throw new Error("It is not this player's turn.");
  }

  const newState: GameState = JSON.parse(JSON.stringify(state));

  if (move.type === "take") {
    if (newState.pendingCard !== null) {
      throw new Error("Current player must place their pending card first.");
    }
    if (move.rowIndex < 0 || move.rowIndex >= ROWS) {
      throw new Error("Invalid row index.");
    }
    const row = newState.grid[move.rowIndex];
    if (!row) throw new Error("Row not found.");
    let colIndex = -1;
    if (move.side === "left") {
      colIndex = row.findIndex((c) => c !== null);
    } else {
      for (let i = row.length - 1; i >= 0; i -= 1) {
        if (row[i] !== null) {
          colIndex = i;
          break;
        }
      }
    }
    if (colIndex === -1) throw new Error("Selected row has no cards left.");
    const card = row[colIndex];
    if (!card) throw new Error("No card at selected position.");
    newState.grid[move.rowIndex][colIndex] = null;
    newState.pendingCard = { playerId, card };
    return newState;
  }

  const placeMove = move as PlaceCardMove;
  if (newState.pendingCard === null || newState.pendingCard.playerId !== playerId) {
    throw new Error("No pending card to place for this player.");
  }
  const { card } = newState.pendingCard;
  const board = newState.boards.find((b) => b.playerId === playerId);
  if (!board) throw new Error("Player board not found.");

  if (placeMove.newEnsemble) {
    board.ensembles.push({
      id: randomUUID(),
      placedCards: [
        {
          card,
          row: placeMove.row,
          col: placeMove.col,
          rotation: placeMove.rotation
        }
      ]
    });
  } else {
    const ei = placeMove.ensembleIndex ?? 0;
    const ensemble = board.ensembles[ei];
    if (!ensemble) throw new Error("Invalid ensemble index.");
    if (
      !canPlaceOnEnsemble(
        ensemble.placedCards,
        card.code,
        placeMove.rotation,
        placeMove.row,
        placeMove.col
      )
    ) {
      throw new Error("Invalid placement: cell occupied or connection counts do not match.");
    }
    ensemble.placedCards.push({
      card,
      row: placeMove.row,
      col: placeMove.col,
      rotation: placeMove.rotation
    });
  }
  newState.pendingCard = null;
  newState.currentTurnIndex =
    (newState.currentTurnIndex + 1) % newState.turnOrder.length;

  const anyRemaining = newState.grid.some((r) => r.some((c) => c !== null));
  if (!anyRemaining) {
    newState.scores = computeScores(newState.boards);
    const entries = Object.entries(newState.scores).sort((a, b) => b[1] - a[1]);
    if (entries.length > 0) newState.winnerPlayerId = entries[0][0];
    newState.phase = "finished";
  }
  return newState;
}

export type ValidPlacement =
  | { ensembleIndex: number; row: number; col: number }
  | { newEnsemble: true; row: number; col: number };

/**
 * Returns valid placements: on existing ensembles (adjacent, matching connections) or start new ensemble (0,0).
 */
export function getValidPlacementCells(
  boards: PlayerBoard[],
  playerId: string,
  cardCode: string,
  rotation: Rotation
): ValidPlacement[] {
  const board = boards.find((b) => b.playerId === playerId);
  if (!board) return [];

  const out: ValidPlacement[] = [];

  for (let ei = 0; ei < board.ensembles.length; ei += 1) {
    const placedCards = board.ensembles[ei].placedCards;
    const cellMap = getBoardCellMap(placedCards);
    let minR = 0,
      maxR = 0,
      minC = 0,
      maxC = 0;
    if (placedCards.length > 0) {
      minR = Math.min(...placedCards.map((p) => p.row));
      maxR = Math.max(...placedCards.map((p) => p.row));
      minC = Math.min(...placedCards.map((p) => p.col));
      maxC = Math.max(...placedCards.map((p) => p.col));
    }
    for (let r = minR - 1; r <= maxR + 1; r += 1) {
      for (let c = minC - 1; c <= maxC + 1; c += 1) {
        if (cellMap.has(cellKey(r, c))) continue;
        if (canPlaceOnEnsemble(placedCards, cardCode, rotation, r, c)) {
          out.push({ ensembleIndex: ei, row: r, col: c });
        }
      }
    }
  }

  out.push({ newEnsemble: true, row: 0, col: 0 });
  return out;
}

export { getEnsembles, isCompleteEnsemble, canPlaceOnEnsemble, getBoardCellMap, getSideFacing };
