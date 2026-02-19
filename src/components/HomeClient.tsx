"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface CreateOrJoinResponse {
  code: string;
  playerId: string;
  isHost: boolean;
}

const playerStorageKey = (code: string) =>
  `assemblage_player_${code.toUpperCase()}`;

async function createRoom(nickname: string): Promise<CreateOrJoinResponse> {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to create room");
  }

  const data = (await res.json()) as CreateOrJoinResponse;
  return data;
}

async function joinRoom(
  code: string,
  nickname: string
): Promise<CreateOrJoinResponse> {
  const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to join room");
  }

  const data = (await res.json()) as CreateOrJoinResponse;
  return data;
}

export default function HomeClient() {
  const router = useRouter();
  const [creatingNickname, setCreatingNickname] = useState("");
  const [joinNickname, setJoinNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState<null | "create" | "join">(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!creatingNickname.trim()) {
      setError("Please enter a nickname to create a room.");
      return;
    }
    try {
      setLoading("create");
      const { code, playerId } = await createRoom(creatingNickname.trim());
      if (typeof window !== "undefined") {
        window.localStorage.setItem(playerStorageKey(code), playerId);
      }
      router.push(`/room/${encodeURIComponent(code)}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!joinCode.trim() || !joinNickname.trim()) {
      setError("Please enter room code and nickname.");
      return;
    }
    try {
      setLoading("join");
      const { code, playerId } = await joinRoom(
        joinCode.trim().toUpperCase(),
        joinNickname.trim()
      );
      if (typeof window !== "undefined") {
        window.localStorage.setItem(playerStorageKey(code), playerId);
      }
      router.push(`/room/${encodeURIComponent(code)}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="space-y-3">
        <h2 className="font-semibold text-lg">Create a room</h2>
        <input
          type="text"
          placeholder="Your nickname"
          value={creatingNickname}
          onChange={(e) => setCreatingNickname(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-ink/20 rounded bg-white/70 focus:outline-none focus:ring-2 focus:ring-ink/40"
        />
        <div>
          <button
            type="submit"
            disabled={loading === "create"}
            className="inline-flex items-center px-4 py-2 rounded bg-ink text-white text-sm font-medium hover:bg-ink/90 disabled:opacity-50"
          >
            {loading === "create" ? "Creating..." : "Create room"}
          </button>
        </div>
      </form>

      <form onSubmit={handleJoin} className="space-y-3">
        <h2 className="font-semibold text-lg">Join a room</h2>
        <div className="flex flex-col sm:flex-row gap-2 max-w-md">
          <input
            type="text"
            placeholder="Room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="flex-1 px-3 py-2 border border-ink/20 rounded bg-white/70 focus:outline-none focus:ring-2 focus:ring-ink/40"
          />
          <input
            type="text"
            placeholder="Your nickname"
            value={joinNickname}
            onChange={(e) => setJoinNickname(e.target.value)}
            className="flex-1 px-3 py-2 border border-ink/20 rounded bg-white/70 focus:outline-none focus:ring-2 focus:ring-ink/40"
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={loading === "join"}
            className="inline-flex items-center px-4 py-2 rounded bg-transparent border border-ink text-sm font-medium hover:bg-ink hover:text-white disabled:opacity-50"
          >
            {loading === "join" ? "Joining..." : "Join room"}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-700 max-w-md">{error}</p>}
    </div>
  );
}

