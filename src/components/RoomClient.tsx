"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";
import { ensureAnonymousUser, getFirebaseClient, initFirebaseEmulators } from "@/lib/firebase/client";
import { deserializeGameStateFromFirestore } from "@/lib/game/firestoreState";
import type { GameStateFirestore } from "@/lib/game/firestoreState";
import type { GameState, Player, Room } from "@/lib/game/types";
import type { Rotation } from "@/lib/game/types";
import GameBoard from "./GameBoard";

interface Props {
  code: string;
}

async function fetchInitialState(code: string) {
  const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/state`, {
    cache: "no-store"
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to load room.");
  }
  return (await res.json()) as {
    room: Room;
    players: Player[];
    gameState: GameState | null;
  };
}

const playerStorageKey = (code: string) =>
  `assemblage_player_${code.toUpperCase()}`;

export default function RoomClient({ code }: Props) {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const { db } = getFirebaseClient();
        initFirebaseEmulators();
        await ensureAnonymousUser();

        const initial = await fetchInitialState(code);
        setRoom(initial.room);
        setPlayers(initial.players);
        setGameState(initial.gameState);

        if (typeof window !== "undefined") {
          const storedId = window.localStorage.getItem(playerStorageKey(code));
          if (storedId) {
            setPlayerId(storedId);
          }
        }

        const roomRef = doc(db, "rooms", code);
        const playersRef = collection(roomRef, "players");
        const stateRef = doc(collection(roomRef, "state"), "current");

        const unsubRoom = onSnapshot(roomRef, (snap) => {
          if (!snap.exists()) return;
          setRoom(snap.data() as Room);
        });

        const unsubPlayers = onSnapshot(
          query(playersRef, orderBy("joinOrder", "asc")),
          (snap) => {
            setPlayers(snap.docs.map((d) => d.data() as Player));
          }
        );

        const unsubState = onSnapshot(stateRef, (snap) => {
          if (snap.exists()) {
            setGameState(
              deserializeGameStateFromFirestore(snap.data() as GameStateFirestore)
            );
          }
        });

        return () => {
          unsubRoom();
          unsubPlayers();
          unsubState();
        };
      } catch (err) {
        setError((err as Error).message);
        setTimeout(() => {
          router.push("/");
        }, 2500);
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [code, router]);

  const handleStartGame = async () => {
    setError(null);
    const res = await fetch(
      `/api/rooms/${encodeURIComponent(code)}/start`,
      { method: "POST" }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to start game.");
    }
  };

  const handleTakeCard = async (rowIndex: number, side: "left" | "right") => {
    setError(null);
    const res = await fetch(
      `/api/rooms/${encodeURIComponent(code)}/move`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "take", rowIndex, side })
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Move rejected.");
    }
  };

  const handlePlaceCard = async (
    rotation: Rotation,
    row: number,
    col: number,
    opts?: { newEnsemble?: boolean; ensembleIndex?: number }
  ) => {
    setError(null);
    const body: { type: "place"; rotation: Rotation; row: number; col: number; newEnsemble?: boolean; ensembleIndex?: number } = {
      type: "place",
      rotation,
      row,
      col
    };
    if (opts?.newEnsemble) body.newEnsemble = true;
    if (typeof opts?.ensembleIndex === "number") body.ensembleIndex = opts.ensembleIndex;
    const res = await fetch(
      `/api/rooms/${encodeURIComponent(code)}/move`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Placement rejected.");
    }
  };

  const isHost = players.find((p) => p.id === playerId)?.isHost ?? false;

  const canStart =
    room?.status === "lobby" && isHost && players.length >= 2 && players.length <= 4;

  const handleNewGame = async () => {
    setError(null);
    const res = await fetch(
      `/api/rooms/${encodeURIComponent(code)}/restart`,
      { method: "POST" }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to start new game.");
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-center mb-4">
        <img
          src="/api/logo"
          alt="Assemblage"
          className="max-w-[200px] w-full h-auto"
        />
      </div>
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Room {code}</h1>
          {room?.status === "lobby" && (
            <p className="text-sm text-ink/70">
              Share this code with 1–3 friends to play Assemblage.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 rounded-full border border-ink/20 bg-white/60">
            Players: {players.length}/4
          </span>
          {room?.status === "lobby" && (
            <button
              type="button"
              disabled={!canStart}
              onClick={handleStartGame}
              className="px-4 py-2 rounded bg-ink text-white text-sm font-medium disabled:opacity-50"
            >
              {canStart ? "Start game" : "Waiting for players"}
            </button>
          )}
        </div>
      </header>

      <section className="grid gap-8 md:grid-cols-[2fr,1fr] items-start">
        <div className="bg-white/60 rounded-lg p-4 shadow-sm min-h-[260px]">
          {loading ? (
            <p className="text-sm text-ink/70">Loading room…</p>
          ) : (
            <GameBoard
              state={gameState}
              currentPlayerId={playerId}
              players={players}
              onTakeCard={handleTakeCard}
              onPlaceCard={handlePlaceCard}
            />
          )}
        </div>
        <aside className="space-y-4 text-sm">
          <div className="bg-white/60 rounded-lg p-4 shadow-sm">
            <h2 className="font-semibold mb-2">Players</h2>
            <ul className="space-y-1">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between"
                >
                  <span>
                    {p.nickname}
                    {p.id === playerId && (
                      <span className="ml-1 text-xs text-ink/60">
                        (you)
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-ink/60">
                    {p.isHost ? "Host" : "Player"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {gameState && gameState.phase === "finished" && (
            <div className="bg-white/80 rounded-lg p-4 shadow-md ring-2 ring-ink/25 space-y-2">
              <h2 className="font-semibold mb-1">Results</h2>
              <ul className="space-y-1">
                {Object.entries(gameState.scores ?? {}).map(([id, score]) => {
                  const player = players.find((p) => p.id === id);
                  const isWinner = id === gameState.winnerPlayerId;
                  return (
                    <li key={id} className="flex justify-between text-xs items-center">
                      <span>
                        {player?.nickname ?? id}
                        {isWinner && (
                          <span className="ml-1 text-ink" aria-label="Winner">★</span>
                        )}
                      </span>
                      <span>{score} pts</span>
                    </li>
                  );
                })}
              </ul>
              {isHost && (
                <button
                  type="button"
                  onClick={handleNewGame}
                  className="w-full mt-2 px-3 py-2 rounded bg-ink text-white text-sm font-medium hover:bg-ink/90"
                >
                  Start another game
                </button>
              )}
            </div>
          )}
        </aside>
      </section>

      {error && (
        <p className="text-sm text-red-700 max-w-md">
          {error}
        </p>
      )}
    </div>
  );
}

