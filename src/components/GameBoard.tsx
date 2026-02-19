"use client";

import { useMemo, useState } from "react";
import { getDotColorForCardCode, getPointsForCardCode } from "@/lib/game/cardCatalog";
import { getValidPlacementCells, isCompleteEnsemble, type ValidPlacement } from "@/lib/game/engine";
import type { GameState, PlacedCard, Player, Rotation } from "@/lib/game/types";

const CARD_SIZE = 48;
const ROTATIONS: Rotation[] = [0, 90, 180, 270];

interface Props {
  state: GameState | null;
  currentPlayerId: string | null;
  players: Player[];
  onTakeCard: (rowIndex: number, side: "left" | "right") => void;
  onPlaceCard: (
    rotation: Rotation,
    row: number,
    col: number,
    opts?: { newEnsemble?: boolean; ensembleIndex?: number }
  ) => void;
}

function CardCell({
  card,
  size,
  rotation
}: {
  card: PlacedCard;
  size: number;
  rotation?: number;
}) {
  return (
    <div
      className="bg-white/70 rounded shadow-sm overflow-hidden flex-shrink-0"
      style={{
        width: size,
        height: size,
        transform: rotation !== undefined ? `rotate(${rotation}deg)` : undefined
      }}
    >
      <img
        src={card.card.imageSrc}
        alt={card.card.code}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export default function GameBoard({
  state,
  currentPlayerId,
  players,
  onTakeCard,
  onPlaceCard
}: Props) {
  const currentTurnPlayerId = state?.turnOrder[state.currentTurnIndex] ?? null;
  const currentTurnNickname =
    currentTurnPlayerId && players.length > 0
      ? players.find((p) => p.id === currentTurnPlayerId)?.nickname ?? currentTurnPlayerId
      : currentTurnPlayerId ?? "";
  const [placeRotation, setPlaceRotation] = useState<Rotation>(0);

  const myBoard = useMemo(
    () =>
      state && currentPlayerId
        ? state.boards.find((b) => b.playerId === currentPlayerId) ?? null
        : null,
    [state, currentPlayerId]
  );
  const ensembles = myBoard?.ensembles ?? [];
  const myPending =
    state?.pendingCard?.playerId === currentPlayerId ? state?.pendingCard ?? null : null;

  const validPlacements = useMemo(() => {
    if (!state || !myPending || !currentPlayerId) return [];
    return getValidPlacementCells(
      state.boards,
      currentPlayerId,
      myPending.card.code,
      placeRotation
    );
  }, [state, currentPlayerId, myPending, placeRotation]);

  const placementKey = (p: ValidPlacement): string => {
    if ("newEnsemble" in p && p.newEnsemble) return "new,0,0";
    if ("ensembleIndex" in p) return `${p.ensembleIndex},${p.row},${p.col}`;
    return "new,0,0";
  };
  const validSet = useMemo(
    () => new Set(validPlacements.map(placementKey)),
    [validPlacements]
  );
  const placementByKey = useMemo(() => {
    const m = new Map<string, ValidPlacement>();
    validPlacements.forEach((p) => m.set(placementKey(p), p));
    return m;
  }, [validPlacements]);

  const handlePlace = (p: ValidPlacement) => {
    if (!validSet.has(placementKey(p))) return;
    const row = p.row;
    const col = p.col;
    if ("newEnsemble" in p && p.newEnsemble) {
      onPlaceCard(placeRotation, row, col, { newEnsemble: true });
    } else if ("ensembleIndex" in p) {
      onPlaceCard(placeRotation, row, col, { ensembleIndex: p.ensembleIndex });
    }
  };

  if (!state) {
    return (
      <div className="text-sm text-ink/70">
        Waiting for game to start…
      </div>
    );
  }

  const isMyTurn =
    currentPlayerId != null &&
    state.turnOrder[state.currentTurnIndex] === currentPlayerId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span>
          Phase:{" "}
          <span className="font-medium">
            {state.phase === "playing" ? "Playing" : "Finished"}
          </span>
        </span>
        {isMyTurn && !myPending && (
          <span className="font-semibold">Your turn — take a card</span>
        )}
        {isMyTurn && myPending && (
          <span className="font-semibold">Place your card</span>
        )}
        {!isMyTurn && state.phase === "playing" && (
          <span>
            Turn:{" "}
            <span className="font-medium">
              {currentTurnNickname}
            </span>
          </span>
        )}
      </div>

      {myPending ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-xs font-medium text-ink/70">Pending card</div>
            <div
              className="rounded shadow-sm overflow-hidden flex-shrink-0"
              style={{
                width: CARD_SIZE * 1.5,
                height: CARD_SIZE * 1.5,
                transform: `rotate(${placeRotation}deg)`
              }}
            >
              <img
                src={myPending.card.imageSrc}
                alt={myPending.card.code}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  const i = ROTATIONS.indexOf(placeRotation);
                  setPlaceRotation(ROTATIONS[(i + 1) % ROTATIONS.length]);
                }}
                className="inline-flex items-center justify-center p-2 rounded hover:bg-ink/5 focus:outline-none focus:ring-2 focus:ring-ink/30"
                title="Rotate card"
                aria-label="Rotate card"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-ink"
                >
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-ink/70 mb-2">
              Your boards — click a highlighted cell to place (or start a new ensemble)
            </div>
            <div className="flex flex-wrap gap-4 items-start">
            {ensembles.map((ensemble, ei) => {
              const placedCards = ensemble.placedCards;
              const minR =
                placedCards.length === 0 ? 0 : Math.min(...placedCards.map((p) => p.row));
              const maxR =
                placedCards.length === 0 ? 0 : Math.max(...placedCards.map((p) => p.row));
              const minC =
                placedCards.length === 0 ? 0 : Math.min(...placedCards.map((p) => p.col));
              const maxC =
                placedCards.length === 0 ? 0 : Math.max(...placedCards.map((p) => p.col));
              const pad = 1;
              const gridMinR = minR - pad;
              const gridMaxR = maxR + pad;
              const gridMinC = minC - pad;
              const gridMaxC = maxC + pad;
              const cols = gridMaxC - gridMinC + 1;
              const rows = gridMaxR - gridMinR + 1;
              const complete = isCompleteEnsemble(placedCards);
              const points = placedCards.reduce((s, pc) => s + getPointsForCardCode(pc.card.code), 0);
              return (
                <div key={ensemble.id} className="flex-shrink-0">
                  <div className="text-xs text-ink/60 mb-1 flex items-center gap-2">
                    <span>Ensemble {ei + 1}</span>
                    {complete && (
                      <span className="font-medium text-green-700">
                        Complete · {points} pts
                      </span>
                    )}
                  </div>
                  <div
                    className="inline-grid gap-0.5 p-2 bg-ink/5 rounded"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, ${CARD_SIZE}px)`,
                      gridTemplateRows: `repeat(${rows}, ${CARD_SIZE}px)`
                    }}
                  >
                    {Array.from({ length: rows * cols }, (_, i) => {
                      const r = gridMinR + Math.floor(i / cols);
                      const c = gridMinC + (i % cols);
                      const key = `${ei},${r},${c}`;
                      const placementKeyStr = `${ei},${r},${c}`;
                      const placed = placedCards.find((p) => p.row === r && p.col === c);
                      const isValid = validSet.has(placementKeyStr);
                      const placement = placementByKey.get(placementKeyStr);
                      if (placed) {
                        return (
                          <div key={key} className="flex items-center justify-center">
                            <CardCell card={placed} size={CARD_SIZE - 4} rotation={placed.rotation} />
                          </div>
                        );
                      }
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => placement && handlePlace(placement)}
                          className={`rounded border-2 flex items-center justify-center ${
                            isValid
                              ? "border-green-500 bg-green-500/10 hover:bg-green-500/20"
                              : "border-ink/10 bg-white/30"
                          }`}
                          style={{ width: CARD_SIZE - 4, height: CARD_SIZE - 4 }}
                          disabled={!isValid}
                        >
                          {isValid && <span className="text-xs text-green-700">+</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="flex-shrink-0">
              <div className="text-xs text-ink/60 mb-1">Start new ensemble</div>
              <div
                className="inline-grid gap-0.5 p-2 bg-ink/5 rounded"
                style={{
                  gridTemplateColumns: `${CARD_SIZE}px`,
                  gridTemplateRows: `${CARD_SIZE}px`
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    const p = placementByKey.get("new,0,0");
                    if (p) handlePlace(p);
                  }}
                  className={`rounded border-2 flex items-center justify-center ${
                    validSet.has("new,0,0")
                      ? "border-green-500 bg-green-500/10 hover:bg-green-500/20"
                      : "border-ink/10 bg-white/30"
                  }`}
                  style={{ width: CARD_SIZE - 4, height: CARD_SIZE - 4 }}
                  disabled={!validSet.has("new,0,0")}
                >
                  {validSet.has("new,0,0") && <span className="text-xs text-green-700">+</span>}
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {state.grid.map((row, rowIndex) => {
              const leftCol = row.findIndex((c) => c !== null);
              let rightCol = -1;
              for (let i = row.length - 1; i >= 0; i -= 1) {
                if (row[i] !== null) {
                  rightCol = i;
                  break;
                }
              }
              const canTake = isMyTurn && !myPending;
              return (
                <div
                  key={rowIndex}
                  className="flex items-center gap-2 text-xs text-ink/70"
                >
                  <div className="flex-1 grid grid-cols-12 gap-0.5 min-w-0">
                    {row.map((card, colIndex) => {
                      if (!card) {
                        return (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className="rounded border border-dashed border-ink/10 aspect-square w-full max-h-12"
                          />
                        );
                      }
                      const isLeft = colIndex === leftCol;
                      const isRight = colIndex === rightCol;
                      const isEligible = canTake && (isLeft || isRight);
                      const side = isLeft ? "left" : "right";
                      if (isEligible) {
                        const dotColor = getDotColorForCardCode(card.code);
                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => onTakeCard(rowIndex, side)}
                            className="rounded shadow-sm overflow-hidden aspect-square w-full max-h-12 border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ink/30 hover:opacity-90"
                            style={{
                              borderColor: dotColor,
                              backgroundColor: `${dotColor}14`
                            }}
                          >
                            <img
                              src={card.imageSrc}
                              alt={card.code}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        );
                      }
                      return (
                        <div
                          key={card.id}
                          className={`rounded shadow-sm overflow-hidden aspect-square w-full max-h-12 ${canTake ? "opacity-40" : ""}`}
                        >
                          <img
                            src={card.imageSrc}
                            alt={card.code}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {ensembles.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-ink/70 mb-2">
                Your boards
              </div>
              <div className="flex flex-wrap gap-4 items-start">
              {ensembles.map((ensemble, ei) => {
                const placedCards = ensemble.placedCards;
                if (placedCards.length === 0) return null;
                const complete = isCompleteEnsemble(placedCards);
                const points = placedCards.reduce((s, pc) => s + getPointsForCardCode(pc.card.code), 0);
                const minR = Math.min(...placedCards.map((p) => p.row));
                const maxR = Math.max(...placedCards.map((p) => p.row));
                const minC = Math.min(...placedCards.map((p) => p.col));
                const maxC = Math.max(...placedCards.map((p) => p.col));
                const pad = 1;
                const gridMinR = minR - pad;
                const gridMaxR = maxR + pad;
                const gridMinC = minC - pad;
                const gridMaxC = maxC + pad;
                const cols = gridMaxC - gridMinC + 1;
                const rows = gridMaxR - gridMinR + 1;
                return (
                  <div key={ensemble.id} className="flex-shrink-0">
                    <div className="text-xs text-ink/60 mb-1 flex items-center gap-2">
                      <span>Ensemble {ei + 1}</span>
                      {complete && (
                        <span className="font-medium text-green-700">
                          Complete · {points} pts
                        </span>
                      )}
                      {!complete && state?.phase === "finished" && (
                        <span className="font-medium text-red-600">
                          Incomplete · −{points} pts
                        </span>
                      )}
                    </div>
                    <div
                      className="inline-grid gap-0.5 p-2 bg-ink/5 rounded"
                      style={{
                        gridTemplateColumns: `repeat(${cols}, ${CARD_SIZE}px)`,
                        gridTemplateRows: `repeat(${rows}, ${CARD_SIZE}px)`
                      }}
                    >
                      {Array.from({ length: rows * cols }, (_, i) => {
                        const r = gridMinR + Math.floor(i / cols);
                        const c = gridMinC + (i % cols);
                        const key = `${ei},${r},${c}`;
                        const placed = placedCards.find((p) => p.row === r && p.col === c);
                        if (placed) {
                          return (
                            <div key={key} className="flex items-center justify-center">
                              <CardCell
                                card={placed}
                                size={CARD_SIZE - 4}
                                rotation={placed.rotation}
                              />
                            </div>
                          );
                        }
                        return (
                          <div
                            key={key}
                            className="rounded border border-ink/10 bg-white/20"
                            style={{
                              width: CARD_SIZE - 4,
                              height: CARD_SIZE - 4
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
