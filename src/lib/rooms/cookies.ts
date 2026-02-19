import { cookies } from "next/headers";

export function playerCookieName(code: string): string {
  return `assemblage_player_${code.toUpperCase()}`;
}

export function getPlayerIdFromCookies(code: string): string | null {
  const name = playerCookieName(code);
  const store = cookies();
  const value = store.get(name)?.value;
  return value ?? null;
}

export function setPlayerIdCookie(code: string, playerId: string) {
  const name = playerCookieName(code);
  const store = cookies();
  store.set(name, playerId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

