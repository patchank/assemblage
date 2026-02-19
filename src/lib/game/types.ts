export type RoomStatus = "lobby" | "in_progress" | "finished";

export interface Room {
  code: string;
  status: RoomStatus;
  createdAt: number;
  updatedAt: number;
  hostPlayerId: string;
}

export interface Player {
  id: string;
  nickname: string;
  joinOrder: number;
  isHost: boolean;
}

export type CardCategory = "point" | "line" | "triangle" | "square";

/**
 * Definition of a logical card type (not an individual copy).
 */
export interface CardDefinition {
  /**
   * Logical code for the card, e.g. "B".
   */
  code: string;
  category: CardCategory;
  /**
   * Importable image path for this card face.
   */
  imageSrc: string;
  /**
   * How many physical copies of this card exist in the deck.
   */
  count: number;
  /**
   * Point value used for scoring.
   */
  points: number;
}

export interface CardInstance {
  /**
   * Unique id for this physical copy.
   */
  id: string;
  /**
   * Reference to the logical card.
   */
  code: string;
  category: CardCategory;
  imageSrc: string;
  points: number;
}

export interface GridCard extends CardInstance {
  row: number;
  col: number;
}

export type Rotation = 0 | 90 | 180 | 270;

/**
 * A card placed on a player's private board.
 */
export interface PlacedCard {
  card: CardInstance;
  row: number;
  col: number;
  rotation: Rotation;
}

/**
 * One ensemble (connected group) on a player's boards.
 */
export interface EnsembleBoard {
  id: string;
  placedCards: PlacedCard[];
}

/**
 * One player's private boards: multiple ensembles, each with its own grid.
 */
export interface PlayerBoard {
  playerId: string;
  ensembles: EnsembleBoard[];
}

/**
 * When non-null, this player has taken a card and must place it before the turn advances.
 */
export interface PendingCard {
  playerId: string;
  card: CardInstance;
}

export type GamePhase = "lobby" | "playing" | "finished";

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  /**
   * 4 rows x 12 columns grid of cards; null means already taken.
   */
  grid: (GridCard | null)[][];
  turnOrder: string[];
  currentTurnIndex: number;
  /**
   * Per-player private boards (replaces piles).
   */
  boards: PlayerBoard[];
  /**
   * Set when current player has taken a card and must place it.
   */
  pendingCard: PendingCard | null;
  scores?: Record<string, number>;
  winnerPlayerId?: string;
}

export interface TakeCardMove {
  type: "take";
  rowIndex: number;
  side: "left" | "right";
}

export interface PlaceCardMove {
  type: "place";
  rotation: Rotation;
  row: number;
  col: number;
  /** If true, start a new ensemble (card placed at row,col, typically 0,0). */
  newEnsemble?: boolean;
  /** When false/omitted and not newEnsemble, which existing ensemble to place on. */
  ensembleIndex?: number;
}

export type Move = TakeCardMove | PlaceCardMove;

