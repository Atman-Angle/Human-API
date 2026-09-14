import { randomUUID, createHash } from "node:crypto";
import type { AuthSession, ZhihuUser } from "@human-api/contracts";

export interface OAuthSession {
  state: string;
  redirectUri: string;
  createdAt: number;
}

const STORE = new Map<string, OAuthSession>();
const AUTH_SESSIONS = new Map<
  string,
  { session: AuthSession; accessToken: string; createdAt: number }
>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes
const AUTH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Generate a state, store it, and return the state value. */
export function createOAuthState(redirectUri: string): string {
  purgeExpired();
  const state = createHash("sha256").update(randomUUID()).digest("hex").slice(0, 24);
  STORE.set(state, { state, redirectUri, createdAt: Date.now() });
  return state;
}

/** Verify a state (one-time use — consumed on success). Returns the redirect_uri or null. */
/** Consume the newest pending OAuth state when Zhihu omits state in its callback. */
export function consumeLatestOAuthState(maxAgeMs = TTL_MS): string | null {
  purgeExpired();
  let latest: OAuthSession | undefined;
  for (const session of STORE.values()) {
    if (!latest || session.createdAt > latest.createdAt) latest = session;
  }
  if (!latest || Date.now() - latest.createdAt > maxAgeMs) return null;
  STORE.delete(latest.state);
  return latest.redirectUri;
}
export function consumeOAuthState(state: string, maxAgeMs = TTL_MS): string | null {
  purgeExpired();
  const session = STORE.get(state);
  if (!session) return null;
  if (Date.now() - session.createdAt > maxAgeMs) {
    STORE.delete(state);
    return null;
  }
  STORE.delete(state); // one-time use
  return session.redirectUri;
}

/** Clean up expired entries. */
function purgeExpired(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [key, session] of STORE) {
    if (session.createdAt < cutoff) STORE.delete(key);
  }
}

/** Create an app session after Zhihu has authenticated the user. The access token stays server-side. */
export function createAuthSession(user: ZhihuUser, accessToken: string, now = Date.now()): string {
  purgeExpiredAuthSessions(now);
  const sessionId = randomUUID();
  AUTH_SESSIONS.set(sessionId, {
    session: {
      user,
      expiresAt: new Date(now + AUTH_TTL_MS).toISOString(),
    },
    accessToken,
    createdAt: now,
  });
  return sessionId;
}

export function getAuthSession(sessionId: string, now = Date.now()): AuthSession | null {
  purgeExpiredAuthSessions(now);
  return AUTH_SESSIONS.get(sessionId)?.session ?? null;
}

export function getAuthAccessToken(sessionId: string, now = Date.now()): string | null {
  purgeExpiredAuthSessions(now);
  return AUTH_SESSIONS.get(sessionId)?.accessToken ?? null;
}

export function deleteAuthSession(sessionId: string): void {
  AUTH_SESSIONS.delete(sessionId);
}

function purgeExpiredAuthSessions(now = Date.now()): void {
  const cutoff = now - AUTH_TTL_MS;
  for (const [key, item] of AUTH_SESSIONS) {
    if (item.createdAt < cutoff) AUTH_SESSIONS.delete(key);
  }
}
